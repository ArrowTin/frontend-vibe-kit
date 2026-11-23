#!/usr/bin/env node
// Install the dependency set for the glass-motion-frontend skill into the current project.
// Works with npm, pnpm, yarn and bun on Windows, macOS and Linux.
//
//   node setup.mjs [--preset full|no-3d|lite] [--pm npm|pnpm|yarn|bun] [--dry-run] [--no-browsers]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { resolvePreset } from "./lib/preset.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const presetsFile = path.join(here, "..", "presets.json");

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      preset: { type: "string", default: "full" },
      pm: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      "no-browsers": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  }));
} catch (error) {
  fail(error.message);
}

if (values.help) {
  console.log(
    "Usage: node setup.mjs [--preset full|no-3d|lite] [--pm npm|pnpm|yarn|bun] [--dry-run] [--no-browsers]",
  );
  process.exit(0);
}

const cwd = process.cwd();
if (!fs.existsSync(path.join(cwd, "package.json"))) {
  fail("package.json not found. Run this from your project root.");
}

function detectPm() {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

const pm = values.pm ?? detectPm();
const PMS = {
  npm: { add: ["install"], dev: "-D", exact: "--save-exact", exec: ["npx"] },
  pnpm: { add: ["add"], dev: "-D", exact: "--save-exact", exec: ["pnpm", "exec"] },
  yarn: { add: ["add"], dev: "-D", exact: "--exact", exec: ["yarn"] },
  bun: { add: ["add"], dev: "-d", exact: "--exact", exec: ["bunx"] },
};
if (!PMS[pm]) fail(`Unsupported package manager "${pm}". Use: ${Object.keys(PMS).join(", ")}`);

let plan;
try {
  plan = resolvePreset(JSON.parse(fs.readFileSync(presetsFile, "utf8")), values.preset);
} catch (error) {
  fail(error.message);
}

const dryRun = values["dry-run"];

function run(args, { optional = false } = {}) {
  console.log(`$ ${args.join(" ")}`);
  if (dryRun) return;
  const result = spawnSync(args[0], args.slice(1), {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    if (optional) console.warn("  (skipped: command failed, run it manually)");
    else fail(`command failed: ${args.join(" ")}`);
  }
}

const cfg = PMS[pm];
console.log(`Preset: ${values.preset}   Package manager: ${pm}${dryRun ? "   (dry run)" : ""}\n`);

if (plan.dependencies.length) run([pm, ...cfg.add, ...plan.dependencies]);
if (plan.devDependencies.length) run([pm, ...cfg.add, cfg.dev, ...plan.devDependencies]);
if (plan.devDependenciesExact.length) {
  run([pm, ...cfg.add, cfg.dev, cfg.exact, ...plan.devDependenciesExact]);
}

const hasBiome = plan.devDependenciesExact.includes("@biomejs/biome");
const biomeConfigured =
  fs.existsSync(path.join(cwd, "biome.json")) || fs.existsSync(path.join(cwd, "biome.jsonc"));
if (hasBiome && !biomeConfigured) run([...cfg.exec, "biome", "init"], { optional: true });

if (plan.devDependencies.includes("@playwright/test") && !values["no-browsers"]) {
  run([...cfg.exec, "playwright", "install", "chromium"], { optional: true });
}

const dlx = { npm: "npx", pnpm: "pnpm dlx", yarn: "yarn dlx", bun: "bunx" }[pm];
console.log(`
Done. Copy-in libraries are added per component (see references/library-map.md):
  1. ${dlx} shadcn@latest init @coss/style      # coss ui base, if components.json is missing
  2. Add coss ui, Magic UI and Tremor components one by one from their docs pages
  3. Mount <Toaster /> (sonner) and <NuqsAdapter> (nuqs) in app/layout.tsx`);
