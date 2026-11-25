#!/usr/bin/env node
// Prepare the current folder for the glass-motion-frontend skill.
//
//   node setup.mjs --detect [--json]            read-only profile of the project; run this FIRST
//   node setup.mjs [--stack next|vite|vanilla] [--preset full|no-3d|lite] [--pm npm|pnpm|yarn|bun]
//                  [--only pkg,pkg] [--dry-run] [--no-browsers] [--approve]
//
// - Existing project: the skill ADAPTS to it. Nothing is installed unless the user approves the exact
//   package list (interactive yes, or --approve). Prefer --only <pkg,...> so only what the design plan
//   needs is approved. The project's framework, UI kit, linter and test runner are kept; packages already
//   present, and packages that would duplicate a library the project already uses, are never offered.
// - Existing project without package.json (static site, PHP, Python, Ruby, Go, .NET, ...): nothing to install.
// - Empty folder: asks which stack to build with (or takes --stack), scaffolds it into a temp folder and
//   copies it in WITHOUT overwriting any existing file (AGENTS.md, .claude/, etc.).
//
// Exit codes: 0 ok | 1 error | 2 NEEDS_STACK (ask which stack) | 3 NEEDS_APPROVAL (ask before installing)
//             | 4 NEEDS_CONFIRMATION (a framework would be added to a project that already runs)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { resolvePreset } from "./lib/preset.mjs";
import { STACKS, normalizeStack, projectEntries, readDeps } from "./lib/stack.mjs";
import { coverage, jobOf } from "./lib/jobs.mjs";
import { detectPackageManager, formatProfile, inspectProject } from "./lib/profile.mjs";
import { appendMissingIgnoreLines, mergeTree } from "./lib/merge.mjs";
import {
  VITE_EXTRA_DEPENDENCIES,
  patchViteTemplate,
  safePackageName,
  setPackageName,
} from "./lib/scaffold.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const presetsFile = path.join(here, "..", "presets.json");
const vanillaTemplate = path.join(here, "templates", "vanilla");
const STACK_NAMES = Object.keys(STACKS).join(" | ");

function fail(message, code = 1) {
  console.error(`error: ${message}`);
  process.exit(code);
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      stack: { type: "string" },
      preset: { type: "string", default: "full" },
      pm: { type: "string" },
      only: { type: "string" },
      detect: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "no-browsers": { type: "boolean", default: false },
      approve: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  }));
} catch (error) {
  fail(error.message);
}

if (values.help) {
  console.log(
    `Usage: node setup.mjs --detect [--json]\n` +
      `       node setup.mjs [--stack ${STACK_NAMES.replaceAll(" | ", "|")}] [--preset full|no-3d|lite] [--pm npm|pnpm|yarn|bun] [--only pkg,pkg] [--dry-run] [--no-browsers] [--approve]`,
  );
  process.exit(0);
}

const cwd = process.cwd();
const dryRun = values["dry-run"];
const profile = inspectProject(cwd);
const detected = profile.kind;

// ---- read-only profile -------------------------------------------------------------------
if (values.detect) {
  console.log(values.json ? JSON.stringify(profile, null, 2) : formatProfile(profile));
  process.exit(0);
}
if (values.json) fail("--json only works together with --detect");

let requestedStack = null;
if (values.stack !== undefined) {
  requestedStack = normalizeStack(values.stack);
  if (!requestedStack) fail(`Unknown stack "${values.stack}". Use: ${STACK_NAMES}`);
}

// --only picks packages from the list offered for an existing project; a project with no package.json has no such list.
if (values.only && !fs.existsSync(path.join(cwd, "package.json"))) {
  fail("--only is for existing projects that have a package.json; a new project gets its full preset");
}

// ---- package manager ---------------------------------------------------------------------
const pm = values.pm ?? detectPackageManager(cwd);
const PMS = {
  npm: { add: ["install"], dev: "-D", exact: "--save-exact", exec: ["npx"], dlx: "npx" },
  pnpm: { add: ["add"], dev: "-D", exact: "--save-exact", exec: ["pnpm", "exec"], dlx: "pnpm dlx" },
  yarn: { add: ["add"], dev: "-D", exact: "--exact", exec: ["yarn"], dlx: "yarn dlx" },
  bun: { add: ["add"], dev: "-d", exact: "--exact", exec: ["bunx"], dlx: "bunx" },
};
if (!PMS[pm]) fail(`Unsupported package manager "${pm}". Use: ${Object.keys(PMS).join(", ")}`);
const cfg = PMS[pm];

function readDeclared(dir, name) {
  return readDeps(dir)[name] ?? null;
}

function run(args, { optional = false, cwd: where = cwd } = {}) {
  console.log(`$ ${args.join(" ")}`);
  if (dryRun) return;
  const result = spawnSync(args[0], args.slice(1), {
    cwd: where,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    if (optional) console.warn("  (skipped: command failed, run it manually)");
    else fail(`command failed: ${args.join(" ")}`);
  }
}

// Package installs: stderr is shown AND captured, so a peer-dependency conflict (npm ERESOLVE) can be
// recognised and explained instead of leaving the user with a raw npm dump and a half-installed project.
function runInstall(args) {
  console.log(`$ ${args.join(" ")}`);
  if (dryRun) return { ok: true, stderr: "" };
  const result = spawnSync(args[0], args.slice(1), {
    cwd,
    stdio: ["inherit", "inherit", "pipe"],
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.stderr) process.stderr.write(result.stderr);
  return { ok: result.status === 0, stderr: result.stderr ?? "" };
}

function installWithRecovery(args, { newProject }) {
  let result = runInstall(args);
  if (result.ok) return;
  const peerConflict = /ERESOLVE/.test(result.stderr);
  // A project this setup just generated is ours to fix: retry once, and say so.
  if (peerConflict && newProject && pm === "npm") {
    console.warn("\nnote: npm found a peer-dependency conflict in the project this setup just created. Retrying once with --legacy-peer-deps.\n");
    result = runInstall([...args, "--legacy-peer-deps"]);
    if (result.ok) return;
  }
  if (peerConflict) {
    const typesNode = /@types\/node/.test(result.stderr);
    console.error(
      "\nnpm could not resolve a peer-dependency conflict. It installed nothing from this command, and package.json is unchanged by it.\n" +
        "Packages from earlier commands in this run stay installed; running setup again skips what is already there.\n" +
        "This is the user's project, so do not force it. Ask which they prefer:\n" +
        (typesNode ? "  1. upgrade @types/node (for example: npm install -D @types/node@^22), a change to their project\n" : "  1. upgrade the package the conflict names, a change to their project\n") +
        "  2. leave out the package that conflicts and use what the project already has\n" +
        "  3. accept an unverified resolution with --legacy-peer-deps (not recommended)",
    );
  }
  fail(`command failed: ${args.join(" ")}`);
}

// ---- which stack? ------------------------------------------------------------------------
function stackChoices() {
  return Object.entries(STACKS).map(([key, s]) => `  --stack ${key.padEnd(8)} ${s.label} (${s.hint})`);
}

function needsStackMessage() {
  if (detected === "other") {
    return [
      `${cwd} has files (${profile.files.slice(0, 6).join(", ")}) but no project the kit recognises.`,
      "This may be a running project in a stack the kit does not know. Do not scaffold into it by default:",
      "adapt to what is there instead (the skill works with plain CSS and JS in the project's own structure).",
      "",
      "Only if the user says this folder is meant to be a NEW project, ask which stack, then run setup again:",
      ...stackChoices(),
      "  (--stack next and --stack vite also need --approve here; --stack vanilla does not)",
      "",
      "NEEDS_STACK: ask the user before choosing. Do not choose for them.",
    ].join("\n");
  }
  return [
    `No project found in ${cwd}.`,
    "Choose how it should be built, then run setup again with --stack:",
    ...stackChoices(),
    "",
    "The skill itself can already be installed here with `install`; only the project is missing.",
    "NEEDS_STACK: ask the user which of the stacks above they want. Do not choose for them.",
  ].join("\n");
}

async function askStack() {
  const keys = Object.keys(STACKS);
  console.log(`What should it be built with?\n`);
  keys.forEach((key, i) => console.log(`  ${i + 1}) ${STACKS[key].label}\n     ${STACKS[key].hint}`));
  console.log(`  ${keys.length + 1}) Cancel (the skill stays installed; run setup again later)\n`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const answer = (await rl.question(`Choose 1-${keys.length + 1}: `)).trim().toLowerCase();
      const index = Number(answer);
      if (Number.isInteger(index) && index >= 1 && index <= keys.length) return keys[index - 1];
      if (index === keys.length + 1 || answer === "q" || answer === "cancel") return null;
      const byName = normalizeStack(answer);
      if (byName) return byName;
      console.log("Please type a number from the list.");
    }
  } finally {
    rl.close();
  }
  return null;
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

// ---- scaffolding -------------------------------------------------------------------------
function report({ created, skipped }) {
  const prefix = dryRun ? "[dry-run] " : "";
  if (created.length) console.log(`${prefix}Added ${created.length} file(s):\n  ${created.join("\n  ")}`);
  if (skipped.length) {
    console.log(`Kept your existing file(s), nothing was overwritten:\n  ${skipped.join("\n  ")}`);
  }
}

function scaffoldVanilla() {
  console.log("Plain HTML, CSS and JS: no packages to install.\n");
  report(mergeTree(vanillaTemplate, cwd, { dryRun }));
  console.log(`\nDone. Open index.html in a browser, or serve the folder:\n  ${cfg.dlx} serve .`);
}

function scaffoldWithTool(stack) {
  const name = safePackageName(path.basename(cwd));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fvk-scaffold-"));
  const appDir = path.join(tmp, "app");
  try {
    if (stack === "next") {
      run(
        [
          "npx", "--yes", "create-next-app@latest", "app",
          "--ts", "--tailwind", "--app", "--biome",
          "--import-alias", "@/*", `--use-${pm}`, "--skip-install", "--disable-git", "--yes",
        ],
        { cwd: tmp },
      );
    } else {
      run(
        ["npx", "--yes", "create-vite@latest", "app", "--template", "react-ts", "--no-interactive", "--no-immediate"],
        { cwd: tmp },
      );
    }
    if (dryRun) {
      console.log("[dry-run] would copy the generated project into the current folder, skipping files that already exist");
      return;
    }
    if (!fs.existsSync(path.join(appDir, "package.json"))) fail("the scaffolding tool did not produce a project");
    setPackageName(appDir, name);
    const warnings = stack === "vite" ? patchViteTemplate(appDir, name) : [];
    report(mergeTree(appDir, cwd));
    const added = appendMissingIgnoreLines(path.join(appDir, ".gitignore"), path.join(cwd, ".gitignore"));
    if (added.length) console.log(`Appended to your existing .gitignore (nothing removed): ${added.join(", ")}`);
    for (const w of warnings) console.warn(`warn: ${w}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- dependencies ------------------------------------------------------------------------
// Libraries that work in any framework. A non-React project never gets the React ones.
const NEUTRAL = new Set([
  "motion", "lenis", "zod", "three", "@types/three",
  "@biomejs/biome", "vitest", "jsdom", "@playwright/test", "@axe-core/playwright",
]);

// existingProject: adapt to what is there and ask before adding anything.
async function installPreset({ extra = [], kind = null, existingProject = false } = {}) {
  const presets = JSON.parse(fs.readFileSync(presetsFile, "utf8"));
  let plan;
  try {
    plan = resolvePreset(presets, values.preset);
  } catch (error) {
    fail(error.message);
  }
  plan.dependencies.push(...extra.filter((p) => !plan.dependencies.includes(p)));

  const existing = readDeps(cwd);
  const notes = [];
  const react = ["next", "vite", "react"].includes(kind);
  if (values.only && !existingProject) fail("--only is for existing projects; a new project gets its full preset");

  if (existingProject) {
    console.log(`Existing project detected: ${profile.label}. The skill adapts to it; no framework is installed or changed.\n`);
    if (!react) {
      for (const key of Object.keys(plan)) plan[key] = plan[key].filter((n) => NEUTRAL.has(n));
      notes.push("React-only libraries are not used here (this project is not React); only framework-neutral packages are offered.");
    }
    // One job, one library: if the project already has a library for a job, the kit's own is not offered.
    const reused = [];
    for (const c of coverage(existing)) {
      if (!c.byOther.length) continue;
      reused.push(`${c.label}: ${c.byOther.join(", ")}`);
      for (const key of Object.keys(plan)) {
        for (const name of plan[key].filter((n) => c.skill.includes(n))) {
          plan[key] = plan[key].filter((n) => n !== name);
          notes.push(`${name} skipped: ${c.label} already covered by ${c.byOther.join(", ")}.`);
        }
      }
    }
    if (reused.length) notes.push(`Reuse what the project already has. ${reused.join(" | ")}`);
  }

  const skipped = [];
  for (const key of Object.keys(plan)) {
    plan[key] = plan[key].filter((n) => {
      if (n in existing) {
        skipped.push(n);
        return false;
      }
      return true;
    });
  }
  let all = [...plan.dependencies, ...plan.devDependencies, ...plan.devDependenciesExact];

  // --only: the user approves a short list (what the design plan needs), not the whole preset.
  if (values.only) {
    const wanted = values.only.split(",").map((s) => s.trim()).filter(Boolean);
    const unavailable = wanted.filter((n) => !all.includes(n));
    if (unavailable.length) {
      fail(
        `--only: ${unavailable.join(", ")} cannot be offered here (already installed, would duplicate a library the project already uses, ` +
          `not in preset "${values.preset}", or not for this stack). Offered: ${all.join(", ") || "nothing"}.`,
      );
    }
    for (const key of Object.keys(plan)) plan[key] = plan[key].filter((n) => wanted.includes(n));
    all = all.filter((n) => wanted.includes(n));
  }

  console.log(`Preset: ${values.preset}   Package manager: ${pm}${dryRun ? "   (dry run)" : ""}\n`);
  if (skipped.length) console.log(`Already in package.json, left untouched: ${skipped.join(", ")}`);
  for (const note of notes) console.log(`note: ${note}`);
  if (skipped.length || notes.length) console.log("");

  if (existingProject) {
    if (!all.length) {
      console.log("Nothing to add: the project already covers what this preset would install.");
      return;
    }
    const width = Math.max(...all.map((n) => n.length)) + 2;
    console.log("Optional packages (not installed yet):");
    for (const name of all) console.log(`  ${name.padEnd(width)}${jobOf(name)?.label ?? ""}`);
    if (plan.devDependencies.includes("@playwright/test") && !values["no-browsers"]) {
      console.log("  (installing @playwright/test also downloads a Chromium browser; add --no-browsers to skip that)");
    }
    console.log(
      "\nApprove only what the design plan needs, with its reason: run again with --only <name,...> --approve.\n" +
        "--approve alone approves everything listed above.\n",
    );
    if (dryRun) {
      console.log("[dry-run] nothing installed. Run again without --dry-run and approve to install them.");
      return;
    }
    if (!values.approve) {
      const interactive = process.stdin.isTTY && process.stdout.isTTY;
      if (!interactive) {
        console.error(
          "NEEDS_APPROVAL: this is an existing project, so nothing was installed.\n" +
            "Ask the user whether to add the packages above (name each one and why the design needs it).\n" +
            "If they approve, run again with --only <the approved names> --approve.\n" +
            "If they decline, continue without them and use the libraries the project already has (plain CSS is fine).",
        );
        process.exit(3);
      }
      if (!(await confirm(`Install these ${all.length} package(s) into this project? [y/N] `))) {
        console.log("Nothing installed. The skill will work with what the project already has.");
        return;
      }
    }
  }

  // create-next-app pins @types/node ^20, but vitest 5 asks for ^22 or newer: npm refuses (ERESOLVE).
  // In a project this setup just generated, move @types/node up in the same command so nothing conflicts.
  if (!existingProject && plan.devDependencies.includes("vitest")) {
    const range = readDeclared(cwd, "@types/node");
    const current = Number((/(\d+)/.exec(range ?? "") ?? [])[1]);
    if (range && current < 22) {
      plan.devDependencies.unshift("@types/node@^22");
      console.log(`note: @types/node ${range} -> ^22 in the project just created (vitest needs 22 or newer).`);
    }
  }

  let ran = false;
  const fresh = !existingProject;
  if (plan.dependencies.length) {
    installWithRecovery([pm, ...cfg.add, ...plan.dependencies], { newProject: fresh });
    ran = true;
  }
  if (plan.devDependencies.length) {
    installWithRecovery([pm, ...cfg.add, cfg.dev, ...plan.devDependencies], { newProject: fresh });
    ran = true;
  }
  if (plan.devDependenciesExact.length) {
    installWithRecovery([pm, ...cfg.add, cfg.dev, cfg.exact, ...plan.devDependenciesExact], { newProject: fresh });
    ran = true;
  }
  // A scaffolded project has no node_modules yet; make sure it gets one.
  if (!existingProject && !ran && !fs.existsSync(path.join(cwd, "node_modules"))) run([pm, "install"]);

  const biomeConfigured = ["biome.json", "biome.jsonc"].some((f) => fs.existsSync(path.join(cwd, f)));
  if (plan.devDependenciesExact.includes("@biomejs/biome") && !biomeConfigured) {
    run([...cfg.exec, "biome", "init"], { optional: true });
  }
  if (plan.devDependencies.includes("@playwright/test") && !values["no-browsers"]) {
    run([...cfg.exec, "playwright", "install", "chromium"], { optional: true });
  }
  if (existingProject) {
    console.log(
      "\nDone. Only the approved packages were added.\n" +
        "Copy-in libraries (coss ui, Magic UI, Tremor) are not part of this. Add one only if the user approved it, and read what its\n" +
        "registry command writes first (files, packages, CSS, components.json). `shadcn init` is a project change, not a component.",
    );
  } else if (react) {
    console.log(`
Done. Copy-in libraries are added per component (see references/library-map.md):
  1. ${cfg.dlx} shadcn@latest init @coss/style      # coss ui base, if components.json is missing
  2. Add coss ui, Magic UI and Tremor components one by one from their docs pages
  3. Mount <Toaster /> (sonner) and <NuqsAdapter> (nuqs) in the root layout`);
  } else console.log("\nDone.");
}

// ---- main --------------------------------------------------------------------------------
function printAdaptOnly() {
  console.log(`Existing project detected: ${profile.label}. The skill adapts to it; nothing is installed or changed.\n`);
  if (profile.members?.length) {
    console.log("Packages in this monorepo:");
    for (const m of profile.members) console.log(`  ${m.dir.padEnd(24)}${m.kind}`);
    console.log("");
  }
  for (const line of profile.policy) console.log(`- ${line}`);
}

// A framework or package.json added to something that already runs is a migration: it needs a yes.
function mustConfirm(stack) {
  if (detected === "empty") return false;
  if (stack === "vanilla" && (detected === "other" || detected === "vanilla")) return false;
  return !values.approve;
}

async function scaffold(stack) {
  if (detected === "other") {
    console.log(`Note: this folder already has files (${profile.files.slice(0, 5).join(", ")}). They will be kept.\n`);
  }
  console.log(`Stack: ${STACKS[stack].label}\n`);
  if (stack === "vanilla") return scaffoldVanilla();
  scaffoldWithTool(stack);
  if (!dryRun) return installPreset({ kind: stack, extra: stack === "vite" ? VITE_EXTRA_DEPENDENCIES : [] });
  console.log("");
  // package.json does not exist yet, so describe the install plan from the preset.
  const presets = JSON.parse(fs.readFileSync(presetsFile, "utf8"));
  const plan = resolvePreset(presets, values.preset);
  const deps = [...plan.dependencies, ...(stack === "vite" ? VITE_EXTRA_DEPENDENCIES : [])];
  console.log(`Preset: ${values.preset}   Package manager: ${pm}   (dry run)\n`);
  run([pm, ...cfg.add, ...deps]);
  if (plan.devDependencies.length) run([pm, ...cfg.add, cfg.dev, ...plan.devDependencies]);
  if (plan.devDependenciesExact.length) run([pm, ...cfg.add, cfg.dev, cfg.exact, ...plan.devDependenciesExact]);
}

if (detected === "invalid-package") fail("package.json is not valid JSON");

if (!["vanilla", "backend", "other", "empty"].includes(detected)) {
  // The project has a package.json: it is running, so it is adapted to, never re-scaffolded.
  if (requestedStack) console.log(`package.json already exists, so --stack ${requestedStack} is ignored.\n`);
  if (detected === "react-native" || detected === "workspace") {
    printAdaptOnly();
    process.exit(0);
  }
  await installPreset({ kind: detected, existingProject: true });
} else if (!requestedStack && detected === "vanilla") {
  console.log("Found a plain HTML project (no package.json). Nothing to install.");
  console.log("The skill will use its no-framework mode (references/vanilla.md).");
} else if (!requestedStack && detected === "backend") {
  printAdaptOnly();
} else {
  let stack = requestedStack;
  if (!stack) {
    // "empty" or "other" without --stack: the user chooses, the tool never does.
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.error(needsStackMessage());
      process.exit(2);
    }
    if (detected === "other") {
      console.log(`This folder already has files (${profile.files.slice(0, 6).join(", ")}) but nothing the kit recognises as a project.`);
      if (!(await confirm("Is it meant to be a NEW project? Your files stay, nothing is overwritten. [y/N] "))) {
        console.log("Nothing changed. The skill will adapt to what is in this folder.");
        process.exit(0);
      }
    } else console.log(`No project found in ${cwd}.`);
    stack = await askStack();
    if (!stack) {
      console.log("Cancelled. Nothing was changed.");
      process.exit(0);
    }
  } else if (mustConfirm(stack)) {
    console.error(
      `NEEDS_CONFIRMATION: ${cwd} already contains ${profile.label}. Adding ${STACKS[stack].label} to it would change the project, not adapt to it.\n` +
        "Do not do this by default. Ask the user. Only if they explicitly approve, run again with --approve\n" +
        "(files that already exist are still never overwritten). Otherwise keep the project's own stack and adapt the design to it.",
    );
    process.exit(4);
  }
  await scaffold(stack);
}
