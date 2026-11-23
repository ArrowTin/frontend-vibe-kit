// Stack detection and the list of stacks `setup` can scaffold.
// Shared by setup.mjs and the repo CLI (doctor, install hints).
import fs from "node:fs";
import path from "node:path";

export const STACKS = {
  next: {
    label: "Next.js (React, App Router)",
    hint: "recommended: the skill and its libraries are built for it",
  },
  vite: {
    label: "Vite + React (TypeScript)",
    hint: "client-side app without a server framework",
  },
  vanilla: {
    label: "Plain HTML, CSS and JS",
    hint: "no framework, no npm; React-only libraries are not used",
  },
};

const ALIASES = {
  next: "next",
  nextjs: "next",
  "next.js": "next",
  vite: "vite",
  "vite-react": "vite",
  vanilla: "vanilla",
  html: "vanilla",
  plain: "vanilla",
  static: "vanilla",
};

export function normalizeStack(value) {
  return ALIASES[String(value ?? "").trim().toLowerCase()] ?? null;
}

// Entries that do not make a folder "a project": VCS, editor, OS files and the
// files this kit (or the user's AI tools) already put there.
const IGNORABLE = new Set([
  ".git",
  ".gitignore",
  ".gitattributes",
  ".DS_Store",
  "Thumbs.db",
  ".idea",
  ".vscode",
  ".editorconfig",
  ".claude",
  ".agents",
  ".opencode",
  "AGENTS.md",
  "CLAUDE.md",
  "AGENTS.md.fvk-backup",
  "CLAUDE.md.fvk-backup",
  "README.md",
  "LICENSE",
  "LICENSE.md",
]);

export function projectEntries(dir) {
  return fs.readdirSync(dir).filter((name) => !IGNORABLE.has(name));
}

// Frameworks other than React. A project on one of these is adapted to, never migrated.
const OTHER_FRAMEWORKS = {
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  "@angular/core": "Angular",
  astro: "Astro",
  "solid-js": "Solid",
  preact: "Preact",
  lit: "Lit",
  "@builder.io/qwik": "Qwik",
};

export function readDeps(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return {};
  }
}

export function otherFrameworkName(deps) {
  const key = Object.keys(OTHER_FRAMEWORKS).find((name) => name in deps);
  return key ? OTHER_FRAMEWORKS[key] : null;
}

// Returns one of:
//   next | vite | react | other-framework | node   (package.json present)
//   invalid-package              (package.json is not valid JSON)
//   vanilla                      (no package.json, index.html present)
//   other                        (no package.json, unrecognised files present)
//   empty                        (nothing but VCS/kit/tool files)
export function detectStack(dir) {
  const pkgFile = path.join(dir, "package.json");
  if (fs.existsSync(pkgFile)) {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    } catch {
      return "invalid-package";
    }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "next";
    if (deps.react && deps.vite) return "vite";
    if (deps.react) return "react";
    if (otherFrameworkName(deps)) return "other-framework";
    return "node";
  }
  if (fs.existsSync(path.join(dir, "index.html"))) return "vanilla";
  return projectEntries(dir).length ? "other" : "empty";
}
