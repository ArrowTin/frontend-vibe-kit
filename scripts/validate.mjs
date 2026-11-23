#!/usr/bin/env node
// Repository validation: skill format, presets, links and version sync.
import fs from "node:fs";
import path from "node:path";
import { ROOT, parseFrontmatter } from "../bin/lib.mjs";
import { resolvePreset } from "../skills/glass-motion-frontend/scripts/lib/preset.mjs";

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

// 1. Required repository files
for (const file of ["README.md", "LICENSE", "CHANGELOG.md", "AGENTS.md", "CLAUDE.md", "package.json"]) {
  if (!fs.existsSync(path.join(ROOT, file))) err(`missing required file: ${file}`);
}

// 2. Skills
const skillsRoot = path.join(ROOT, "skills");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
if (!skillDirs.length) err("no skills found under skills/");

for (const dirent of skillDirs) {
  const dir = path.join(skillsRoot, dirent.name);
  const file = path.join(dir, "SKILL.md");
  if (!fs.existsSync(file)) {
    err(`${rel(dir)}: SKILL.md is missing (must be uppercase)`);
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const meta = parseFrontmatter(text);
  if (!meta) {
    err(`${rel(file)}: frontmatter missing`);
    continue;
  }
  if (!meta.name) err(`${rel(file)}: "name" missing`);
  else {
    if (meta.name !== dirent.name) err(`${rel(file)}: name "${meta.name}" must equal folder "${dirent.name}"`);
    if (!NAME_RE.test(meta.name) || meta.name.length > 64) err(`${rel(file)}: invalid name "${meta.name}"`);
  }
  if (!meta.description) err(`${rel(file)}: "description" missing`);
  else if (meta.description.length > 1024) err(`${rel(file)}: description is ${meta.description.length} chars (max 1024)`);
  if (meta.version && meta.version !== pkg.version) {
    err(`${rel(file)}: metadata.version ${meta.version} differs from package.json ${pkg.version}`);
  }
  const lines = text.split("\n").length;
  if (lines > 500) warn(`${rel(file)}: ${lines} lines; keep SKILL.md under 500 and move detail to references/`);

  // presets
  const presetsFile = path.join(dir, "presets.json");
  if (fs.existsSync(presetsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(presetsFile, "utf8"));
      for (const name of Object.keys(data.presets ?? {})) resolvePreset(data, name);
      if (!data.presets?.full) err(`${rel(presetsFile)}: preset "full" is required`);
    } catch (e) {
      err(`${rel(presetsFile)}: ${e.message}`);
    }
  }
}

// 3. Relative markdown links must resolve
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}
const LINK_RE = /\]\((?!https?:|mailto:|#)([^)\s#]+)(?:#[^)]*)?\)/g;
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(LINK_RE)) {
    const target = path.resolve(path.dirname(file), decodeURI(match[1]));
    if (!fs.existsSync(target)) err(`${rel(file)}: broken link -> ${match[1]}`);
  }
}

// 4. Files that SKILL.md promises must exist
const skillText = fs.readFileSync(path.join(skillsRoot, "glass-motion-frontend", "SKILL.md"), "utf8");
for (const match of skillText.matchAll(/`((?:references|scripts)\/[A-Za-z0-9_./-]+\.(?:md|mjs|json))`/g)) {
  if (!fs.existsSync(path.join(skillsRoot, "glass-motion-frontend", match[1]))) {
    err(`SKILL.md mentions ${match[1]} but the file does not exist`);
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log(`ok: ${skillDirs.length} skill(s) valid, links resolve, versions in sync (${pkg.version})`);
