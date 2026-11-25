#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import {
  AGENTS,
  BACKUP_SUFFIX,
  BLOCK_START,
  DEFAULT_AGENTS,
  MANIFEST,
  ROOT,
  SKILL,
  SRC,
  inspectInstalled,
  readMeta,
  removeBlock,
  resolveTarget,
  uniqueTargets,
  upsertBlock,
  writeManifest,
} from "./lib.mjs";
import { resolvePreset } from "../skills/glass-motion-frontend/scripts/lib/preset.mjs";
import { STACKS } from "../skills/glass-motion-frontend/scripts/lib/stack.mjs";
import { inspectProject } from "../skills/glass-motion-frontend/scripts/lib/profile.mjs";

const HELP = `Frontend Vibe Kit: install the "${SKILL}" skill for AI coding tools.

Usage:
  frontend-vibe-kit <command> [options]

Commands:
  install      Copy the skill into the folders your AI tools read
  uninstall    Remove the skill from those folders
  doctor       Check installation, versions and project setup
  detect       Read-only profile of the project: framework, styling, what it already uses for each
               job (icons, toasts, forms, data, motion, tests...), its own check scripts. Changes nothing
  setup        Existing project (any stack): adapts to it and installs nothing unless you approve the
               listed packages. Empty folder: asks what to build with (Next.js, Vite + React, or plain
               HTML/CSS/JS) and scaffolds it

Options:
  --agent <list>      claude, opencode, codex, antigravity (comma separated) or "all" (default)
  --global            Use user-level folders instead of the project
  --dir <path>        Project directory (default: current directory)
  --stack <name>      next, vite or vanilla (plain HTML/CSS/JS). For setup in an empty folder
  --preset <name>     full (default), no-3d or lite  (setup and doctor)
  --pm <name>         npm, pnpm, yarn or bun  (setup; default: detected from lockfile)
  --with-agents-md    Also add the rules block to AGENTS.md and CLAUDE.md (project scope).
                      Existing text is never rewritten; the block is appended between markers
  --no-backup         Do not save AGENTS.md.fvk-backup / CLAUDE.md.fvk-backup before editing
  --approve           Approve what setup asks about: the optional packages it lists for an existing project,
                      or (with --stack) adding a framework to a folder that already has a project
  --only <list>       With --approve: install only these packages from the list (comma separated)
  --json              With detect: machine-readable output
  --no-browsers       Skip the Playwright browser download  (setup)
  --force             Overwrite or remove a skill folder that has local changes
  --dry-run           Show what would happen without changing anything
  --home <path>       Override the home directory (testing)
  -h, --help          Show this help
  -v, --version       Show the kit version

Examples:
  npx github:ArrowTin/frontend-vibe-kit install --with-agents-md
  npx github:ArrowTin/frontend-vibe-kit install --global
  npx github:ArrowTin/frontend-vibe-kit setup --preset no-3d
  npx github:ArrowTin/frontend-vibe-kit setup --stack vanilla     # empty folder, no framework
  npx github:ArrowTin/frontend-vibe-kit detect                    # what is this project? (read-only)
  npx github:ArrowTin/frontend-vibe-kit setup --only zod --approve  # existing project: add just what the plan needs
  npx github:ArrowTin/frontend-vibe-kit doctor

Setup exit codes: 2 = ask which stack, 3 = ask before installing, 4 = ask before adding a framework to a running project.
`;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

let values;
let positionals;
try {
  ({ values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      agent: { type: "string", default: "all" },
      global: { type: "boolean", default: false },
      dir: { type: "string" },
      home: { type: "string" },
      preset: { type: "string", default: "full" },
      stack: { type: "string" },
      pm: { type: "string" },
      "with-agents-md": { type: "boolean", default: false },
      "no-backup": { type: "boolean", default: false },
      "no-browsers": { type: "boolean", default: false },
      approve: { type: "boolean", default: false },
      only: { type: "string" },
      json: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  }));
} catch (error) {
  fail(`${error.message}\n\n${HELP}`);
}

const srcMeta = readMeta(SRC);
if (values.version) {
  console.log(srcMeta?.version ?? "unknown");
  process.exit(0);
}

const command = positionals[0];
if (values.help || !command) {
  console.log(HELP);
  process.exit(command || values.help ? 0 : 1);
}

const base = path.resolve(values.dir ?? process.cwd());
const home = path.resolve(values.home ?? os.homedir());
const scope = values.global ? "global" : "project";
const dryRun = values["dry-run"];
const tag = dryRun ? "[dry-run] " : "";

function resolveAgents(value) {
  const list =
    value === "all" ? DEFAULT_AGENTS : value.split(",").map((s) => s.trim()).filter(Boolean);
  for (const agent of list) {
    if (!AGENTS.includes(agent)) fail(`Unknown agent "${agent}". Use: ${AGENTS.join(", ")} or all`);
  }
  if (!list.length) fail("--agent needs at least one value");
  return list;
}

function assertSafeDest(dest) {
  if (path.basename(dest) !== SKILL) fail(`Refusing to touch unexpected path: ${dest}`);
}

function agentsMdBody() {
  return fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
}

// Add or refresh the kit's block in one file. Never rewrites the user's own text.
function writeBlock(file, body) {
  const target = resolveTarget(file);
  if (target.kind === "dangling" || target.kind === "not-a-file") {
    console.log(`note: ${file} is a ${target.kind === "dangling" ? "broken symlink" : "folder"}; left untouched.`);
    return false;
  }
  const exists = target.kind === "file";
  const text = exists ? fs.readFileSync(target.path, "utf8") : "";
  const result = upsertBlock(text, body);
  if (result.error) {
    console.log(`skip ${file}: ${result.error} (kit markers are damaged). Nothing was changed.`);
    console.log("  Fix or delete the lines containing the glass-motion-frontend markers, then run again.");
    process.exitCode = 1;
    return false;
  }
  if (result.action === "unchanged") {
    console.log(`${tag}up to date ${file}`);
    return true;
  }
  const verb = { create: "create", append: "append rules block to", update: "update rules block in" }[result.action];
  console.log(`${tag}${verb} ${file}`);
  if (dryRun) return true;
  if (exists && !values["no-backup"]) {
    const backup = target.path + BACKUP_SUFFIX;
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(target.path, backup, fs.constants.COPYFILE_EXCL);
      console.log(`  backup of your original: ${backup}`);
    }
  }
  fs.writeFileSync(target.path, result.next);
  return true;
}

function upsertAgentsMd() {
  const agents = path.join(base, "AGENTS.md");
  if (!writeBlock(agents, agentsMdBody())) return;

  // Claude Code reads CLAUDE.md, so point it at AGENTS.md. Append-only, like above.
  const claude = path.join(base, "CLAUDE.md");
  const c = resolveTarget(claude);
  const a = resolveTarget(agents);
  if (c.kind === "file" && a.kind === "file" && c.path === a.path) {
    console.log(`ok ${claude} is the same file as AGENTS.md; nothing to add`);
    return;
  }
  if (c.kind === "file") {
    const text = fs.readFileSync(c.path, "utf8");
    if (/^\s*@AGENTS\.md\s*$/m.test(text) && !text.includes(BLOCK_START)) {
      console.log(`ok ${claude} already imports @AGENTS.md`);
      return;
    }
  }
  writeBlock(claude, "@AGENTS.md");
}

function removeAgentsMdBlock() {
  for (const name of ["AGENTS.md", "CLAUDE.md"]) {
    const file = path.join(base, name);
    const target = resolveTarget(file);
    if (target.kind !== "file") continue;
    const result = removeBlock(fs.readFileSync(target.path, "utf8"));
    if (result.error) {
      console.log(`skip ${file}: ${result.error} (kit markers are damaged). Nothing was changed.`);
      process.exitCode = 1;
      continue;
    }
    if (!result.removed) continue;
    console.log(`${tag}remove rules block from ${file}`);
    if (dryRun) continue;
    const backup = target.path + BACKUP_SUFFIX;
    if (result.next.trim() === "") fs.rmSync(target.path);
    else fs.writeFileSync(target.path, result.next);
    if (fs.existsSync(backup) && fs.existsSync(target.path) && fs.readFileSync(backup, "utf8") === result.next) {
      fs.rmSync(backup);
    }
  }
}

function install() {
  const agents = resolveAgents(values.agent);
  if (scope === "project" && !fs.existsSync(base)) fail(`Directory not found: ${base}`);
  let blocked = 0;
  for (const [dir, who] of uniqueTargets(agents, scope, base, home)) {
    const dest = path.join(dir, SKILL);
    assertSafeDest(dest);
    const { state, changed } = inspectInstalled(dest);
    const label = `(${who.join("+")}): ${dest}`;

    if (state === "identical") {
      console.log(`${tag}up to date ${label}`);
      if (!dryRun && !fs.existsSync(path.join(dest, MANIFEST))) writeManifest(dest, srcMeta?.version);
      continue;
    }
    if (state === "modified" && !values.force) {
      blocked++;
      console.log(`skip ${label}`);
      console.log("  A folder with this name already exists and differs from the kit:");
      for (const file of changed.slice(0, 8)) console.log(`    - ${file}`);
      if (changed.length > 8) console.log(`    ... and ${changed.length - 8} more`);
      console.log("  Nothing was changed. Use --force to overwrite it.");
      continue;
    }
    const verb = state === "missing" ? "install" : state === "modified" ? "overwrite (forced)" : "update";
    console.log(`${tag}${verb} ${label}`);
    if (dryRun) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(SRC, dest, { recursive: true });
    writeManifest(dest, srcMeta?.version);
  }
  if (values["with-agents-md"]) {
    if (scope === "global") console.log("note: --with-agents-md applies to projects only; skipped.");
    else upsertAgentsMd();
  }
  if (blocked) process.exitCode = 1;
  else if (!dryRun) {
    console.log("\nDone. Restart your AI tool so it re-reads skills, then run: doctor");
    if (scope === "project") {
      const found = inspectProject(base);
      if (found.kind === "empty") {
        console.log("\nThe skill is installed, but there is no project in this folder yet.");
        console.log("Next: run `setup` and choose what to build with:");
        for (const [key, stack] of Object.entries(STACKS)) console.log(`  setup --stack ${key.padEnd(8)} ${stack.label}`);
      } else if (found.kind === "other") {
        console.log("\nThis folder has files the kit does not recognise as a project. Treat it as an existing project:");
        console.log("run `detect`; the skill adapts to what is here and scaffolds nothing unless you say so.");
      } else {
        console.log(`\nExisting project detected (${found.label}). The skill adapts to it and installs nothing into it.`);
        console.log("Next: run `detect` to see what it already uses for each job.");
      }
    }
  }
}

function uninstall() {
  const agents = values.agent === "all" ? AGENTS : resolveAgents(values.agent);
  let removed = 0;
  let blocked = 0;
  for (const [dir, who] of uniqueTargets(agents, scope, base, home)) {
    const dest = path.join(dir, SKILL);
    assertSafeDest(dest);
    const { state, changed } = inspectInstalled(dest);
    if (state === "missing") continue;
    if (state === "modified" && !values.force) {
      blocked++;
      console.log(`skip (${who.join("+")}): ${dest} has local changes (${changed.slice(0, 3).join(", ")}). Use --force to remove it.`);
      continue;
    }
    console.log(`${tag}remove (${who.join("+")}): ${dest}`);
    removed++;
    if (!dryRun) fs.rmSync(dest, { recursive: true, force: true });
  }
  if (values["with-agents-md"] && scope === "project") removeAgentsMdBlock();
  if (blocked) process.exitCode = 1;
  else if (!removed) console.log("Nothing to remove.");
}

function readAllDeps() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(base, "package.json"), "utf8"));
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return {};
  }
}

function doctor() {
  let failures = 0;
  let warnings = 0;
  const line = (label, message) => console.log(`  ${label.padEnd(5)} ${message}`);
  const ok = (m) => line("ok", m);
  const warn = (m) => {
    warnings++;
    line("warn", m);
  };
  const bad = (m) => {
    failures++;
    line("FAIL", m);
  };
  // Not a problem: how the skill will behave in this project.
  const info = (m) => line("info", m);

  console.log(`Frontend Vibe Kit doctor (kit version ${srcMeta?.version ?? "?"})\n`);

  console.log("Environment");
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 18) ok(`Node ${process.versions.node}`);
  else bad(`Node ${process.versions.node}; version 18.3 or newer is required`);

  console.log("\nSkill installations");
  let found = 0;
  for (const where of ["project", "global"]) {
    for (const [dir, who] of uniqueTargets(AGENTS, where, base, home)) {
      const dest = path.join(dir, SKILL);
      if (!fs.existsSync(dest)) continue;
      found++;
      const label = `${where} (${who.join("+")}): ${dest}`;
      const meta = readMeta(dest);
      if (!meta?.name || !meta?.description) bad(`${label}: SKILL.md missing or frontmatter invalid`);
      else if (meta.name !== SKILL) bad(`${label}: name "${meta.name}" does not match the folder`);
      else if (srcMeta?.version && meta.version !== srcMeta.version) {
        warn(`${label}: version ${meta.version ?? "?"}, kit has ${srcMeta.version}. Run install to update`);
      } else ok(label);
      if (!fs.existsSync(path.join(dest, "references"))) warn(`${dest} has no references/ folder`);
    }
  }
  if (!found) bad("skill is not installed. Run: install (add --global for all projects)");

  console.log(`\nProject (${base})`);
  const proj = inspectProject(base);
  const stack = proj.kind;
  const exists = (f) => fs.existsSync(path.join(base, f));
  const usesNpm = ["next", "vite", "react"].includes(stack);

  if (stack === "empty") {
    warn("no project yet (no package.json, no index.html). Run: setup  (Next.js, Vite + React or plain HTML/CSS/JS)");
  } else if (stack === "other") {
    warn(`files found (${proj.files.slice(0, 4).join(", ")}) but no recognised project. Treat it as existing: run detect; nothing is scaffolded unless you say so`);
  } else if (stack === "vanilla") {
    ok("plain HTML/CSS/JS project: the skill uses its no-framework mode; React, Tailwind and npm checks skipped");
  } else if (stack === "backend") {
    ok(`existing ${proj.label} project: the skill adapts to it (its templates, styles and scripts); no Node tooling is added`);
  } else if (stack === "invalid-package") {
    bad("package.json is not valid JSON");
  } else if (stack === "react-native") {
    ok(`${proj.label} app: the skill adapts to it, but it targets web UIs, so its web libraries do not apply`);
  } else if (stack === "workspace") {
    ok("monorepo root: run doctor inside the package you are changing (--dir <package>)");
    for (const m of proj.members ?? []) info(`${m.dir}  (${m.kind})`);
  } else if (stack === "other-framework" || stack === "node") {
    ok("existing non-React project: the skill adapts to it; React, Tailwind and preset checks skipped");
  } else {
    const pkg = JSON.parse(fs.readFileSync(path.join(base, "package.json"), "utf8"));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const major = (range) => Number((/(\d+)/.exec(range ?? "") ?? [])[1]);
    ok(`existing ${proj.label} project: the skill adapts to it and reuses what it already has`);

    if (!all.react) warn("react is not a dependency");
    else if (major(all.react) < 19) info(`react ${all.react}: fine, the skill adapts (some recipes assume React 19 APIs; check before using them)`);
    else ok(`react ${all.react}`);

    if (!all.tailwindcss) info("no Tailwind: tokens and glass go into the project's own styling (references/adapt.md)");
    else if (major(all.tailwindcss) < 4) info(`tailwindcss ${all.tailwindcss}: keep it, do not upgrade; use the @layer components version of the glass utility (references/adapt.md)`);
    else ok(`tailwindcss ${all.tailwindcss}`);

    const covered = proj.jobs.filter((j) => j.covered);
    if (covered.length) info(`already covered, reused as is: ${covered.map((j) => j.label).join(", ")}`);

    try {
      const presets = JSON.parse(fs.readFileSync(path.join(SRC, "presets.json"), "utf8"));
      const plan = resolvePreset(presets, values.preset);
      const wanted = [...plan.dependencies, ...plan.devDependencies, ...plan.devDependenciesExact];
      const missing = wanted.filter((name) => !all[name]);
      if (missing.length) info(`preset "${values.preset}": ${missing.length} package(s) missing: ${missing.join(", ")}. Optional in a running project: setup offers them, you approve only what the design needs`);
      else ok(`preset "${values.preset}": all ${wanted.length} packages present`);
    } catch (error) {
      bad(error.message);
    }
  }
  if (usesNpm) {
    const linter = ["eslint", "prettier", "oxlint", "@biomejs/biome"].find((n) => n in readAllDeps());
    if (exists("biome.json") || exists("biome.jsonc")) ok("biome config");
    else if (linter) info(`${linter} is the project's linter/formatter: kept, the kit does not replace it`);
    else info("no linter configured: the kit does not add one to a running project without asking");
    if (exists("components.json")) ok("components.json (shadcn-style registry)");
    for (const [check, v] of Object.entries(proj.checks)) info(`project ${check}: ${v.command}`);
  }
  if (exists("AGENTS.md")) ok("AGENTS.md");
  else warn("no AGENTS.md (install with --with-agents-md)");

  console.log(`\n${failures} failure(s), ${warnings} warning(s)`);
  process.exit(failures ? 1 : 0);
}

function detect() {
  const args = [path.join(SRC, "scripts", "setup.mjs"), "--detect"];
  if (values.json) args.push("--json");
  const result = spawnSync(process.execPath, args, { cwd: base, stdio: "inherit" });
  process.exit(result.status ?? 1);
}

function setup() {
  const args = [path.join(SRC, "scripts", "setup.mjs"), "--preset", values.preset];
  if (values.stack) args.push("--stack", values.stack);
  if (values.only) args.push("--only", values.only);
  if (values.pm) args.push("--pm", values.pm);
  if (dryRun) args.push("--dry-run");
  if (values["no-browsers"]) args.push("--no-browsers");
  if (values.approve) args.push("--approve");
  const result = spawnSync(process.execPath, args, { cwd: base, stdio: "inherit" });
  process.exit(result.status ?? 1);
}

switch (command) {
  case "install":
    install();
    break;
  case "uninstall":
    uninstall();
    break;
  case "doctor":
    doctor();
    break;
  case "setup":
    setup();
    break;
  case "detect":
    detect();
    break;
  default:
    fail(`Unknown command "${command}".\n\n${HELP}`);
}
