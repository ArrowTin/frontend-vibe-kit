#!/usr/bin/env node
// Prepare the current folder for the glass-motion-frontend skill.
//
//   node setup.mjs [--stack next|vite|vanilla] [--preset full|no-3d|lite] [--pm npm|pnpm|yarn|bun]
//                  [--dry-run] [--no-browsers] [--approve]
//
// - Existing project (package.json): the skill ADAPTS to it. Nothing is installed unless the user
//   approves the exact package list (interactive yes, or --approve). The project's framework,
//   UI kit, linter and test runner are kept; packages already present are never touched.
// - Existing plain HTML project (index.html, no package.json): nothing to install.
// - Empty folder: asks which stack to build with (or takes --stack), scaffolds it into a temp
//   folder and copies it in WITHOUT overwriting any existing file (AGENTS.md, .claude/, etc.).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { resolvePreset } from "./lib/preset.mjs";
import { STACKS, detectStack, normalizeStack, otherFrameworkName, projectEntries, readDeps } from "./lib/stack.mjs";
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
    `Usage: node setup.mjs [--stack ${STACK_NAMES.replaceAll(" | ", "|")}] [--preset full|no-3d|lite] [--pm npm|pnpm|yarn|bun] [--dry-run] [--no-browsers] [--approve]`,
  );
  process.exit(0);
}

const cwd = process.cwd();
const dryRun = values["dry-run"];

let requestedStack = null;
if (values.stack !== undefined) {
  requestedStack = normalizeStack(values.stack);
  if (!requestedStack) fail(`Unknown stack "${values.stack}". Use: ${STACK_NAMES}`);
}

// ---- package manager ---------------------------------------------------------------------
function detectPm() {
  const has = (f) => fs.existsSync(path.join(cwd, f));
  if (has("pnpm-lock.yaml")) return "pnpm";
  if (has("bun.lockb") || has("bun.lock")) return "bun";
  if (has("yarn.lock")) return "yarn";
  return "npm";
}

const pm = values.pm ?? detectPm();
const PMS = {
  npm: { add: ["install"], dev: "-D", exact: "--save-exact", exec: ["npx"], dlx: "npx" },
  pnpm: { add: ["add"], dev: "-D", exact: "--save-exact", exec: ["pnpm", "exec"], dlx: "pnpm dlx" },
  yarn: { add: ["add"], dev: "-D", exact: "--exact", exec: ["yarn"], dlx: "yarn dlx" },
  bun: { add: ["add"], dev: "-d", exact: "--exact", exec: ["bunx"], dlx: "bunx" },
};
if (!PMS[pm]) fail(`Unsupported package manager "${pm}". Use: ${Object.keys(PMS).join(", ")}`);
const cfg = PMS[pm];

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

// ---- which stack? ------------------------------------------------------------------------
function needsStackMessage() {
  const lines = [
    `No project found in ${cwd}.`,
    "Choose how it should be built, then run setup again with --stack:",
    ...Object.entries(STACKS).map(([key, s]) => `  --stack ${key.padEnd(8)} ${s.label} (${s.hint})`),
    "",
    "The skill itself can already be installed here with `install`; only the project is missing.",
    "NEEDS_STACK: ask the user which of the stacks above they want. Do not choose for them.",
  ];
  return lines.join("\n");
}

async function askStack() {
  const keys = Object.keys(STACKS);
  console.log(`No project found in ${cwd}. What should it be built with?\n`);
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

// Tools the project already uses for a job: do not add a second one.
function conflicts(existing) {
  const has = (...names) => names.some((n) => n in existing);
  const drop = new Map();
  if (has("eslint", "prettier", "@biomejs/biome")) drop.set("@biomejs/biome", "linting/formatting is already covered");
  if (has("jest", "@jest/core")) {
    for (const n of ["vitest", "jsdom", "@vitejs/plugin-react", "@testing-library/react", "@testing-library/jest-dom", "@testing-library/user-event"]) {
      drop.set(n, "tests already run on Jest");
    }
  }
  if (has("cypress")) for (const n of ["@playwright/test", "@axe-core/playwright"]) drop.set(n, "end-to-end tests already run on Cypress");
  return drop;
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

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

  if (existingProject) {
    const framework = otherFrameworkName(existing);
    const label = { next: "Next.js", vite: "Vite + React", react: "React", node: "a Node project without a UI framework" }[kind] ?? framework;
    console.log(`Existing project detected: ${framework ?? label}. The skill adapts to it; no framework is installed or changed.\n`);
    if (!react) {
      for (const key of Object.keys(plan)) plan[key] = plan[key].filter((n) => NEUTRAL.has(n));
      notes.push("React-only libraries are not used here (this project is not React); only framework-neutral packages are offered.");
    }
    for (const [name, why] of conflicts(existing)) {
      for (const key of Object.keys(plan)) {
        if (plan[key].includes(name)) {
          plan[key] = plan[key].filter((n) => n !== name);
          notes.push(`${name} skipped: ${why}.`);
        }
      }
    }
  }

  const fullPlan = structuredClone(plan);
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
  const all = [...plan.dependencies, ...plan.devDependencies, ...plan.devDependenciesExact];

  console.log(`Preset: ${values.preset}   Package manager: ${pm}${dryRun ? "   (dry run)" : ""}\n`);
  if (skipped.length) console.log(`Already in package.json, left untouched: ${skipped.join(", ")}`);
  for (const note of notes) console.log(`note: ${note}`);
  if (skipped.length || notes.length) console.log("");

  if (existingProject) {
    if (!all.length) {
      console.log("Nothing to add: the project already covers what this preset would install.");
      return;
    }
    console.log(`Optional packages (not installed yet):\n  ${all.join("\n  ")}\n`);
    if (dryRun) {
      console.log("[dry-run] nothing installed. Run again without --dry-run and approve to install them.");
      return;
    }
    if (!values.approve) {
      const interactive = process.stdin.isTTY && process.stdout.isTTY;
      if (!interactive) {
        console.error(
          "NEEDS_APPROVAL: this is an existing project, so nothing was installed.\n" +
            "Ask the user whether to add the packages above. If they approve, run again with --approve.\n" +
            "If they decline, continue without them and use the libraries the project already has.",
        );
        process.exit(3);
      }
      if (!(await confirm(`Install these ${all.length} package(s) into this project? [y/N] `))) {
        console.log("Nothing installed. The skill will work with what the project already has.");
        return;
      }
    }
  }

  let ran = false;
  if (plan.dependencies.length) {
    run([pm, ...cfg.add, ...plan.dependencies]);
    ran = true;
  }
  if (plan.devDependencies.length) {
    run([pm, ...cfg.add, cfg.dev, ...plan.devDependencies]);
    ran = true;
  }
  if (plan.devDependenciesExact.length) {
    run([pm, ...cfg.add, cfg.dev, cfg.exact, ...plan.devDependenciesExact]);
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
  if (react) {
    console.log(`
Done. Copy-in libraries are added per component (see references/library-map.md):
  1. ${cfg.dlx} shadcn@latest init @coss/style      # coss ui base, if components.json is missing
  2. Add coss ui, Magic UI and Tremor components one by one from their docs pages
  3. Mount <Toaster /> (sonner) and <NuqsAdapter> (nuqs) in the root layout`);
    if (existingProject) console.log("Skip any of these where the project already has its own UI kit, toasts or forms; do not add a second one.");
  } else console.log("\nDone.");
}

// ---- main --------------------------------------------------------------------------------
const detected = detectStack(cwd);

if (detected === "invalid-package") fail("package.json is not valid JSON");

if (detected === "vanilla" && !requestedStack) {
  console.log("Found a plain HTML project (index.html, no package.json). Nothing to install.");
  console.log("The skill will use its no-framework mode (references/vanilla.md).");
  process.exit(0);
}

const hasPackage = !["vanilla", "other", "empty"].includes(detected);
if (hasPackage) {
  if (requestedStack) {
    console.log(`package.json already exists, so --stack ${requestedStack} is ignored.\n`);
  }
  await installPreset({ kind: detected, existingProject: true });
} else {
  let stack = requestedStack;
  if (!stack) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.error(needsStackMessage());
      process.exit(2);
    }
    stack = await askStack();
    if (!stack) {
      console.log("Cancelled. Nothing was changed.");
      process.exit(0);
    }
  }
  if (detected === "other") {
    console.log(`Note: this folder already has files (${projectEntries(cwd).slice(0, 5).join(", ")}). They will be kept.\n`);
  }
  console.log(`Stack: ${STACKS[stack].label}\n`);
  if (stack === "vanilla") scaffoldVanilla();
  else {
    scaffoldWithTool(stack);
    if (!dryRun) await installPreset({ kind: stack, extra: stack === "vite" ? VITE_EXTRA_DEPENDENCIES : [] });
    else {
      console.log("");
      // Show the install plan too; package.json does not exist yet, so describe it from the preset.
      const presets = JSON.parse(fs.readFileSync(presetsFile, "utf8"));
      const plan = resolvePreset(presets, values.preset);
      const deps = [...plan.dependencies, ...(stack === "vite" ? VITE_EXTRA_DEPENDENCIES : [])];
      console.log(`Preset: ${values.preset}   Package manager: ${pm}   (dry run)\n`);
      run([pm, ...cfg.add, ...deps]);
      if (plan.devDependencies.length) run([pm, ...cfg.add, cfg.dev, ...plan.devDependencies]);
      if (plan.devDependenciesExact.length) run([pm, ...cfg.add, cfg.dev, cfg.exact, ...plan.devDependenciesExact]);
    }
  }
}
