// A read-only profile of the project in a folder: what it is, what it already uses for each job,
// which checks it has. `setup --detect` prints it; the agent reads it BEFORE planning or installing.
// Nothing here writes to the project.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  backendName,
  detectStack,
  nativeAppName,
  otherFrameworkName,
  projectEntries,
  readJson,
  workspaceMembers,
} from "./stack.mjs";
import { coverage } from "./jobs.mjs";

const LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

// `packageManager` field first (corepack), then a lockfile in this folder or a parent project
// (a package inside a monorepo keeps its lockfile at the root), then npm.
export function detectPackageManager(dir) {
  const field = readJson(path.join(dir, "package.json"))?.packageManager;
  const named = typeof field === "string" ? field.split("@")[0] : null;
  if (["npm", "pnpm", "yarn", "bun"].includes(named)) return named;

  let current = path.resolve(dir);
  for (let level = 0; level < 6; level++) {
    const isProject = level === 0 || fs.existsSync(path.join(current, "package.json"));
    if (isProject) {
      for (const [file, pm] of LOCKFILES) if (fs.existsSync(path.join(current, file))) return pm;
    }
    if (fs.existsSync(path.join(current, ".git"))) break;
    const up = path.dirname(current);
    if (up === current) break;
    current = up;
  }
  return "npm";
}

const major = (range) => {
  const m = /(\d+)/.exec(range ?? "");
  return m ? Number(m[1]) : null;
};

const STYLING = [
  ["styled-components", "styled-components"],
  ["@emotion/react", "Emotion"],
  ["@vanilla-extract/css", "vanilla-extract"],
  ["@stitches/react", "Stitches"],
  ["@pandacss/dev", "Panda CSS"],
  ["unocss", "UnoCSS"],
  ["sass", "Sass/SCSS"],
  ["less", "Less"],
  ["bootstrap", "Bootstrap"],
];

// Where the project's global styles usually live: new tokens go into one of these, not into a new system.
const STYLE_CANDIDATES = [
  "app/globals.css", "src/app/globals.css", "styles/globals.css", "src/styles/globals.css",
  "src/index.css", "src/main.css", "src/style.css", "src/styles.css", "src/App.css", "src/assets/main.css",
  "src/assets/css/main.css", "resources/css/app.css", "assets/css/app.css", "assets/css/main.css",
  "public/css/styles.css", "public/css/style.css", "static/css/style.css", "css/styles.css", "css/style.css",
  "style.css", "styles.css",
];

function styling(dir, deps) {
  const systems = [];
  const tailwind = deps.tailwindcss ?? null;
  if (tailwind || deps["@tailwindcss/vite"] || deps["@tailwindcss/postcss"]) {
    systems.push(tailwind ? `Tailwind CSS ${major(tailwind) ?? tailwind}` : "Tailwind CSS");
  }
  for (const [pkg, name] of STYLING) if (pkg in deps) systems.push(name);
  const exists = (f) => fs.existsSync(path.join(dir, f));
  return {
    systems,
    tailwindMajor: major(tailwind),
    tailwindConfig: ["js", "cjs", "mjs", "ts"].map((e) => `tailwind.config.${e}`).find(exists) ?? null,
    shadcn: exists("components.json"),
    globalStyles: STYLE_CANDIDATES.filter(exists).slice(0, 4),
  };
}

// package.json scripts the project already has for each check, so the agent runs THOSE.
const SCRIPT_KEYS = {
  lint: ["lint", "check", "biome", "eslint"],
  format: ["format", "fmt", "prettier"],
  typecheck: ["typecheck", "type-check", "check-types", "tsc"],
  test: ["test", "test:unit", "unit"],
  e2e: ["e2e", "test:e2e", "playwright", "cypress", "test:e2e:ci"],
  build: ["build"],
};

function checks(pkg, pm) {
  const run = pm === "npm" ? "npm run" : pm === "yarn" ? "yarn" : pm === "bun" ? "bun run" : "pnpm";
  const scripts = pkg?.scripts ?? {};
  const out = {};
  for (const [check, keys] of Object.entries(SCRIPT_KEYS)) {
    const name = keys.find((k) => k in scripts);
    if (name) out[check] = { script: name, command: name === "test" && pm === "npm" ? "npm test" : `${run} ${name}`, runs: scripts[name] };
  }
  return out;
}

function gitState(dir) {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" });
  if (r.error || r.status !== 0) return null;
  const changes = r.stdout.split("\n").filter(Boolean).length;
  return { clean: changes === 0, changes };
}

const REACT_WEB = ["next", "vite", "react"];

function labelFor(kind, deps, backend) {
  const base = {
    next: "Next.js",
    vite: "Vite + React",
    react: "React",
    "react-native": nativeAppName(deps) === "Expo" ? "Expo (React Native)" : "React Native",
    "other-framework": otherFrameworkName(deps),
    node: "Node project without a UI framework",
    workspace: "monorepo",
    vanilla: "static HTML site",
    backend,
    other: "unrecognised files",
    empty: "empty folder",
  }[kind];
  return backend && kind !== "backend" && base ? `${base} (with a ${backend} backend)` : (base ?? kind);
}

const POLICY = {
  empty: [
    "New project. Ask the user which stack they want (next, vite or vanilla); never choose for them.",
    "Then run: setup --stack <stack>. The approved-library table applies freely here.",
  ],
  other: [
    "The folder has files but no project the kit recognises. Treat it as an existing project: do NOT scaffold.",
    "Only if the user says it is meant to be a new project: setup --stack <stack> (next and vite also need --approve).",
  ],
  vanilla: [
    "Existing static site. Adapt: plain CSS and JS inside the site's own structure (references/vanilla.md).",
    "Nothing to install, no build step, no npm.",
  ],
  backend: [
    "Existing server-side project. Adapt: put tokens, glass and motion in its own templates, stylesheets and scripts (references/adapt.md).",
    "Nothing to install; no Node toolchain or framework is added.",
  ],
  "react-native": [
    "React Native / Expo app. This skill targets web UIs; its web libraries and CSS do not apply. Nothing to install.",
  ],
  workspace: [
    "Monorepo root. Do not install at the root. Run detect/setup inside the package you are changing (--dir <package>).",
  ],
  node: [
    "Existing Node project without a UI framework. Adapt with plain CSS and JS (references/vanilla.md).",
    "Framework-neutral packages are optional and need the user's approval.",
  ],
  "other-framework": [
    "Existing project: keep its framework and components. Use the plain-CSS guidance (references/vanilla.md).",
    "React-only libraries are never used here; framework-neutral packages are optional and need approval.",
  ],
  react: [
    "Existing React project. Reuse its UI kit, styling, forms, data, toasts, icons, linter and test runner.",
    "A library for an UNCOVERED job is optional and needs the user's approval (setup --only <pkg> --approve).",
  ],
};
POLICY.next = POLICY.react;
POLICY.vite = POLICY.react;

export function inspectProject(dir) {
  const kind = detectStack(dir);
  const pkg = readJson(path.join(dir, "package.json"));
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const backend = backendName(dir);
  const react = REACT_WEB.includes(kind);
  const hasPackage = Boolean(pkg);
  const pm = hasPackage ? detectPackageManager(dir) : null;

  const profile = {
    dir,
    kind,
    label: labelFor(kind, deps, backend),
    mode: kind === "empty" ? "new" : kind === "other" ? "unknown" : "existing",
    packageManager: pm,
    backend,
    styling: hasPackage || kind === "vanilla" || kind === "backend" ? styling(dir, deps) : null,
    jobs: react || kind === "node" || kind === "other-framework" ? coverage(deps) : [],
    checks: checks(pkg, pm ?? "npm"),
    git: gitState(dir),
    policy: POLICY[kind] ?? [],
  };
  if (kind === "workspace") profile.members = workspaceMembers(dir, pkg);
  if (kind === "other") profile.files = projectEntries(dir).slice(0, 10);
  return profile;
}

export function formatProfile(profile) {
  const lines = [];
  const add = (label, value) => lines.push(`${label.padEnd(16)}${value}`);
  add("Folder", profile.dir);
  add("Project", `${profile.label}   [${profile.mode}]`);
  if (profile.packageManager) add("Package manager", profile.packageManager);
  const s = profile.styling;
  if (s) {
    const parts = [...s.systems];
    if (s.shadcn) parts.push("components.json (shadcn-style registry)");
    add("Styling", parts.length ? parts.join(", ") : "plain CSS (no styling library found)");
    if (s.globalStyles.length) add("Global styles", s.globalStyles.join(", "));
  }
  if (profile.members?.length) {
    lines.push("Packages:");
    for (const m of profile.members) lines.push(`  ${m.dir.padEnd(24)}${m.kind}`);
  }
  if (profile.files?.length) add("Files found", profile.files.join(", "));

  const covered = profile.jobs.filter((j) => j.covered);
  const open = profile.jobs.filter((j) => !j.covered && j.skill.length);
  if (covered.length) {
    lines.push("Already covered (reuse these; the kit adds nothing for these jobs):");
    for (const j of covered) lines.push(`  ${j.label.padEnd(26)}${[...j.byOther, ...j.byKit].join(", ")}`);
  }
  if (open.length && ["next", "vite", "react"].includes(profile.kind)) {
    lines.push(`Not covered yet (optional, each needs approval): ${open.map((j) => j.label).join(", ")}`);
  }
  const have = Object.entries(profile.checks);
  add("Project checks", have.length ? have.map(([k, v]) => `${k}=\`${v.command}\``).join("  ") : "none found");
  if (profile.git) add("Git", profile.git.clean ? "clean working tree" : `${profile.git.changes} uncommitted change(s)`);
  lines.push("", "What the skill does here:");
  for (const p of profile.policy) lines.push(`  - ${p}`);
  return lines.join("\n");
}
