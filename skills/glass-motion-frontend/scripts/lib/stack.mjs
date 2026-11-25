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

// React-based native apps: they have `react`, but they are not web UIs.
const NATIVE_APPS = {
  "react-native": "React Native",
  expo: "Expo",
};

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function readDeps(dir) {
  const pkg = readJson(path.join(dir, "package.json"));
  return { ...pkg?.dependencies, ...pkg?.devDependencies };
}

export function otherFrameworkName(deps) {
  const key = Object.keys(OTHER_FRAMEWORKS).find((name) => name in deps);
  return key ? OTHER_FRAMEWORKS[key] : null;
}

export function nativeAppName(deps) {
  const key = Object.keys(NATIVE_APPS).find((name) => name in deps);
  return key ? NATIVE_APPS[key] : null;
}

// next | react-native | vite | react | other-framework | node, from a dependency map.
export function kindOfDeps(deps) {
  if (deps.next) return "next";
  if (nativeAppName(deps)) return "react-native";
  if (deps.react && deps.vite) return "vite";
  if (deps.react) return "react";
  if (otherFrameworkName(deps)) return "other-framework";
  return "node";
}

// ---- Projects that are not JavaScript projects ----------------------------------------------
// A folder with one of these files is a running project in another ecosystem (server-rendered
// templates, a static-site generator, ...). It is adapted to, never turned into a Next.js app.
// More specific entries come first.
const BACKENDS = [
  { name: "Laravel (PHP)", files: ["artisan"] },
  { name: "WordPress", files: ["wp-config.php", "wp-content"] },
  { name: "PHP (Composer)", files: ["composer.json"] },
  { name: "PHP", files: ["index.php"] },
  { name: "Django (Python)", files: ["manage.py"] },
  { name: "Python", files: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py"] },
  { name: "Ruby (Rails/Sinatra)", files: ["Gemfile", "config.ru"] },
  { name: "Go", files: ["go.mod"] },
  { name: "Rust", files: ["Cargo.toml"] },
  { name: "Java/Kotlin (JVM)", files: ["pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"] },
  { name: "Elixir (Phoenix)", files: ["mix.exs"] },
  { name: "Hugo", files: ["hugo.toml", "hugo.yaml", "hugo.json"] },
  { name: "Jekyll", files: ["_config.yml", "_config.yaml"] },
  { name: "MkDocs", files: ["mkdocs.yml"] },
];

export function backendName(dir) {
  const has = (f) => fs.existsSync(path.join(dir, f));
  for (const backend of BACKENDS) if (backend.files.some(has)) return backend.name;
  try {
    if (fs.readdirSync(dir).some((n) => /\.(csproj|fsproj|vbproj|sln)$/i.test(n))) return ".NET";
  } catch {
    /* unreadable folder: not a backend as far as we can tell */
  }
  return null;
}

// A static site: an HTML file in the folder, or an index.html in a usual web folder.
const STATIC_DIRS = ["public", "src", "static", "www", "site", "docs", "dist", "web", "html"];

export function hasStaticHtml(dir) {
  try {
    if (fs.readdirSync(dir).some((n) => /\.html?$/i.test(n))) return true;
  } catch {
    return false;
  }
  return STATIC_DIRS.some((d) => fs.existsSync(path.join(dir, d, "index.html")));
}

// ---- Monorepos -------------------------------------------------------------------------------
const WORKSPACE_FILES = ["pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json", "rush.json"];

export function isWorkspaceRoot(dir, pkg) {
  return Boolean(pkg?.workspaces) || WORKSPACE_FILES.some((f) => fs.existsSync(path.join(dir, f)));
}

function workspacePatterns(dir, pkg) {
  const out = [];
  const ws = pkg?.workspaces;
  if (Array.isArray(ws)) out.push(...ws);
  else if (Array.isArray(ws?.packages)) out.push(...ws.packages);

  const pnpmFile = path.join(dir, "pnpm-workspace.yaml");
  if (fs.existsSync(pnpmFile)) {
    let inPackages = false;
    for (const line of fs.readFileSync(pnpmFile, "utf8").split(/\r?\n/)) {
      if (/^packages\s*:/.test(line)) {
        inPackages = true;
        continue;
      }
      if (/^\S/.test(line) && !line.startsWith("-")) inPackages = false;
      const m = inPackages ? /^\s*-\s*['"]?([^'"#]+?)['"]?\s*(?:#.*)?$/.exec(line) : null;
      if (m) out.push(m[1]);
    }
  }
  return out.length ? out : ["apps/*", "packages/*"];
}

function expandPattern(dir, pattern) {
  const clean = pattern.trim().replace(/^\.\//, "").replace(/\/+$/, "");
  if (!clean || clean.startsWith("!")) return [];
  const star = /^(.*)\/\*{1,2}$/.exec(clean);
  let candidates;
  if (star) {
    try {
      candidates = fs
        .readdirSync(path.join(dir, star[1]), { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name !== "node_modules")
        .map((e) => `${star[1]}/${e.name}`);
    } catch {
      return [];
    }
  } else if (/[*?{}[\]]/.test(clean)) {
    return [];
  } else candidates = [clean];
  return candidates.filter((rel) => fs.existsSync(path.join(dir, rel, "package.json")));
}

// [{ dir: "apps/web", name: "web", kind: "next" }, ...] for the packages of a monorepo.
export function workspaceMembers(dir, pkg = readJson(path.join(dir, "package.json"))) {
  const members = [];
  const seen = new Set();
  for (const pattern of workspacePatterns(dir, pkg)) {
    for (const rel of expandPattern(dir, pattern)) {
      if (seen.has(rel) || members.length >= 60) continue;
      seen.add(rel);
      const memberPkg = readJson(path.join(dir, rel, "package.json"));
      const deps = { ...memberPkg?.dependencies, ...memberPkg?.devDependencies };
      members.push({ dir: rel, name: memberPkg?.name ?? path.basename(rel), kind: kindOfDeps(deps) });
    }
  }
  return members;
}

// Returns one of:
//   next | vite | react | react-native | other-framework | node   (package.json present)
//   workspace                    (package.json is a monorepo root with no UI framework of its own)
//   invalid-package              (package.json is not valid JSON)
//   backend                      (no package.json; a PHP, Python, Ruby, Go, .NET, ... project)
//   vanilla                      (no package.json; static HTML)
//   other                        (no package.json; unrecognised files present)
//   empty                        (nothing but VCS/kit/tool files)
export function detectStack(dir) {
  const pkgFile = path.join(dir, "package.json");
  if (fs.existsSync(pkgFile)) {
    const pkg = readJson(pkgFile);
    if (!pkg) return "invalid-package";
    const kind = kindOfDeps({ ...pkg.dependencies, ...pkg.devDependencies });
    if (kind !== "node") return kind;
    return isWorkspaceRoot(dir, pkg) ? "workspace" : "node";
  }
  if (backendName(dir)) return "backend";
  if (hasStaticHtml(dir)) return "vanilla";
  return projectEntries(dir).length ? "other" : "empty";
}
