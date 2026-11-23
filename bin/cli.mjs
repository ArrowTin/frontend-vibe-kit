#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import {
  AGENTS,
  BLOCK_END,
  BLOCK_START,
  DEFAULT_AGENTS,
  ROOT,
  SKILL,
  SRC,
  readMeta,
  uniqueTargets,
} from "./lib.mjs";
import { resolvePreset } from "../skills/glass-motion-frontend/scripts/lib/preset.mjs";

const HELP = `Frontend Vibe Kit: install the "${SKILL}" skill for AI coding tools.

Usage:
  frontend-vibe-kit <command> [options]

Commands:
  install      Copy the skill into the folders your AI tools read
  uninstall    Remove the skill from those folders
  doctor       Check installation, versions and project setup
  setup        Install the npm dependencies of a preset into the current project

Options:
  --agent <list>      claude, opencode, codex, antigravity (comma separated) or "all" (default)
  --global            Use user-level folders instead of the project
  --dir <path>        Project directory (default: current directory)
  --preset <name>     full (default), no-3d or lite  (setup and doctor)
  --pm <name>         npm, pnpm, yarn or bun  (setup; default: detected from lockfile)
  --with-agents-md    Also add the rules block to AGENTS.md and CLAUDE.md (project scope)
  --no-browsers       Skip the Playwright browser download  (setup)
  --dry-run           Show what would happen without changing anything
  --home <path>       Override the home directory (testing)
  -h, --help          Show this help
  -v, --version       Show the kit version

Examples:
  npx github:ArrowTin/frontend-vibe-kit install --with-agents-md
  npx github:ArrowTin/frontend-vibe-kit install --global
  npx github:ArrowTin/frontend-vibe-kit setup --preset no-3d
  npx github:ArrowTin/frontend-vibe-kit doctor
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
      pm: { type: "string" },
      "with-agents-md": { type: "boolean", default: false },
      "no-browsers": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
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

function agentsMdBlock() {
  const rules = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8").trim();
  return `${BLOCK_START}\n${rules}\n${BLOCK_END}\n`;
}

function upsertAgentsMd() {
  const target = path.join(base, "AGENTS.md");
  const block = agentsMdBlock();
  if (!fs.existsSync(target)) {
    console.log(`${tag}create ${target}`);
    if (!dryRun) fs.writeFileSync(target, block);
  } else {
    const text = fs.readFileSync(target, "utf8");
    const start = text.indexOf(BLOCK_START);
    const end = text.indexOf(BLOCK_END);
    let next;
    if (start !== -1 && end > start) {
      next = text.slice(0, start) + block.trimEnd() + text.slice(end + BLOCK_END.length);
      console.log(`${tag}update rules block in ${target}`);
    } else {
      next = `${text.replace(/\s*$/, "")}\n\n${block}`;
      console.log(`${tag}append rules block to ${target}`);
    }
    if (!dryRun) fs.writeFileSync(target, next);
  }

  const claude = path.join(base, "CLAUDE.md");
  if (!fs.existsSync(claude)) {
    console.log(`${tag}create ${claude}`);
    if (!dryRun) fs.writeFileSync(claude, "@AGENTS.md\n");
  } else if (!fs.readFileSync(claude, "utf8").includes("@AGENTS.md")) {
    console.log(`note: ${claude} exists. Add the line "@AGENTS.md" so Claude Code reads the rules.`);
  }
}

function removeAgentsMdBlock() {
  const target = path.join(base, "AGENTS.md");
  if (!fs.existsSync(target)) return;
  const text = fs.readFileSync(target, "utf8");
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end < start) return;
  const next = (text.slice(0, start) + text.slice(end + BLOCK_END.length)).replace(/\n{3,}/g, "\n\n");
  console.log(`${tag}remove rules block from ${target}`);
  if (dryRun) return;
  if (next.trim() === "") fs.rmSync(target);
  else fs.writeFileSync(target, `${next.trim()}\n`);
}

function install() {
  const agents = resolveAgents(values.agent);
  if (scope === "project" && !fs.existsSync(base)) fail(`Directory not found: ${base}`);
  for (const [dir, who] of uniqueTargets(agents, scope, base, home)) {
    const dest = path.join(dir, SKILL);
    assertSafeDest(dest);
    const verb = fs.existsSync(dest) ? "update " : "install";
    console.log(`${tag}${verb} (${who.join("+")}): ${dest}`);
    if (dryRun) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(SRC, dest, { recursive: true });
  }
  if (values["with-agents-md"]) {
    if (scope === "global") console.log("note: --with-agents-md applies to projects only; skipped.");
    else upsertAgentsMd();
  }
  if (!dryRun) {
    console.log("\nDone. Restart your AI tool so it re-reads skills, then run: doctor");
  }
}

function uninstall() {
  const agents = values.agent === "all" ? AGENTS : resolveAgents(values.agent);
  let removed = 0;
  for (const [dir, who] of uniqueTargets(agents, scope, base, home)) {
    const dest = path.join(dir, SKILL);
    assertSafeDest(dest);
    if (!fs.existsSync(dest)) continue;
    console.log(`${tag}remove (${who.join("+")}): ${dest}`);
    removed++;
    if (!dryRun) fs.rmSync(dest, { recursive: true, force: true });
  }
  if (values["with-agents-md"] && scope === "project") removeAgentsMdBlock();
  if (!removed) console.log("Nothing to remove.");
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
  const pkgFile = path.join(base, "package.json");
  if (!fs.existsSync(pkgFile)) {
    warn("no package.json here; dependency checks skipped");
  } else {
    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    } catch {
      bad("package.json is not valid JSON");
    }
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const major = (range) => Number((/(\d+)/.exec(range ?? "") ?? [])[1]);

    if (!all.react) warn("react is not a dependency");
    else if (major(all.react) < 19) warn(`react ${all.react}; React 19 is recommended`);
    else ok(`react ${all.react}`);

    if (!all.tailwindcss) warn("tailwindcss is not a dependency (Tailwind v4 is required)");
    else if (major(all.tailwindcss) < 4) warn(`tailwindcss ${all.tailwindcss}; Tailwind v4 is required`);
    else ok(`tailwindcss ${all.tailwindcss}`);

    try {
      const presets = JSON.parse(fs.readFileSync(path.join(SRC, "presets.json"), "utf8"));
      const plan = resolvePreset(presets, values.preset);
      const wanted = [...plan.dependencies, ...plan.devDependencies, ...plan.devDependenciesExact];
      const missing = wanted.filter((name) => !all[name]);
      if (missing.length) warn(`preset "${values.preset}": ${missing.length} package(s) missing: ${missing.join(", ")}. Run: setup`);
      else ok(`preset "${values.preset}": all ${wanted.length} packages present`);
    } catch (error) {
      bad(error.message);
    }

    if (all.eslint || all.prettier) warn("ESLint/Prettier found; the kit uses Biome only");
  }
  const exists = (f) => fs.existsSync(path.join(base, f));
  if (exists("biome.json") || exists("biome.jsonc")) ok("biome config");
  else warn("no biome.json (run setup, or: npx biome init)");
  if (exists("components.json")) ok("components.json (shadcn / coss ui)");
  else warn("no components.json (run: npx shadcn@latest init @coss/style)");
  if (exists("AGENTS.md")) ok("AGENTS.md");
  else warn("no AGENTS.md (install with --with-agents-md)");

  console.log(`\n${failures} failure(s), ${warnings} warning(s)`);
  process.exit(failures ? 1 : 0);
}

function setup() {
  const args = [path.join(SRC, "scripts", "setup.mjs"), "--preset", values.preset];
  if (values.pm) args.push("--pm", values.pm);
  if (dryRun) args.push("--dry-run");
  if (values["no-browsers"]) args.push("--no-browsers");
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
  default:
    fail(`Unknown command "${command}".\n\n${HELP}`);
}
