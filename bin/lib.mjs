// Shared helpers for the CLI and the validation script.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SKILL = "glass-motion-frontend";
export const SRC = path.join(ROOT, "skills", SKILL);
export const AGENTS = ["claude", "opencode", "codex", "antigravity"];
// Default targets. OpenCode already reads .claude/skills and .agents/skills (project and global),
// so it needs its own copy only when asked for explicitly with --agent opencode.
export const DEFAULT_AGENTS = ["claude", "codex", "antigravity"];
export const BLOCK_START = `<!-- ${SKILL}:start -->`;
export const BLOCK_END = `<!-- ${SKILL}:end -->`;

const unquote = (s) => s.trim().replace(/^["']|["']$/g, "");

export function parseFrontmatter(text) {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  const body = match[1];
  const get = (key) => {
    const m = body.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? unquote(m[1]) : undefined;
  };
  const versionMatch = body.match(/^\s+version:\s*(.+)$/m);
  return {
    name: get("name"),
    description: get("description"),
    license: get("license"),
    version: versionMatch ? unquote(versionMatch[1]) : undefined,
  };
}

export function readMeta(skillDir) {
  const file = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(file)) return null;
  return parseFrontmatter(fs.readFileSync(file, "utf8"));
}

export function skillsDirFor(agent, scope, base, home) {
  if (scope === "global") {
    return {
      claude: path.join(home, ".claude", "skills"),
      opencode: path.join(home, ".config", "opencode", "skills"),
      codex: path.join(home, ".codex", "skills"),
      antigravity: path.join(home, ".gemini", "config", "skills"),
    }[agent];
  }
  return {
    claude: path.join(base, ".claude", "skills"),
    opencode: path.join(base, ".opencode", "skills"),
    codex: path.join(base, ".agents", "skills"),
    antigravity: path.join(base, ".agents", "skills"),
  }[agent];
}

// Map of skills directory -> agents that read it (deduplicated).
export function uniqueTargets(agents, scope, base, home) {
  const map = new Map();
  for (const agent of agents) {
    const dir = skillsDirFor(agent, scope, base, home);
    if (!map.has(dir)) map.set(dir, []);
    map.get(dir).push(agent);
  }
  return map;
}

// ---- Safe-install helpers -------------------------------------------------
import crypto from "node:crypto";

export const MANIFEST = ".fvk-manifest.json";

// Map of relative path -> sha256 for every file under dir (manifest excluded).
export function hashDir(dir) {
  const out = {};
  (function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name !== MANIFEST) {
        const key = path.relative(dir, full).split(path.sep).join("/");
        out[key] = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
      }
    }
  })(dir);
  return out;
}

export function diffHashes(actual, expected) {
  const changes = [];
  for (const key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
    if (!(key in expected)) changes.push(`${key} (added)`);
    else if (!(key in actual)) changes.push(`${key} (removed)`);
    else if (actual[key] !== expected[key]) changes.push(`${key} (edited)`);
  }
  return changes.sort();
}

// state: missing | identical | clean-update | modified
export function inspectInstalled(dest) {
  if (!fs.existsSync(dest)) return { state: "missing", changed: [] };
  const current = hashDir(dest);
  const source = hashDir(SRC);
  if (diffHashes(current, source).length === 0) return { state: "identical", changed: [] };
  const manifestFile = path.join(dest, MANIFEST);
  let recorded = null;
  try {
    recorded = JSON.parse(fs.readFileSync(manifestFile, "utf8")).files;
  } catch {
    /* no usable manifest: origin unknown */
  }
  if (!recorded) return { state: "modified", changed: diffHashes(current, source) };
  const changed = diffHashes(current, recorded);
  return changed.length ? { state: "modified", changed } : { state: "clean-update", changed: [] };
}

export function writeManifest(dest, version) {
  const body = { kit: "frontend-vibe-kit", skill: SKILL, version, files: hashDir(SRC) };
  fs.writeFileSync(path.join(dest, MANIFEST), `${JSON.stringify(body, null, 2)}\n`);
}

// ---- Rules block in AGENTS.md / CLAUDE.md ---------------------------------------------------
// The user's own text is never rewritten. The kit only appends one block between two markers,
// or replaces what is between those markers on a later run.

const detectEol = (text) => (text.includes("\r\n") ? "\r\n" : "\n");
const withEol = (text, eol) => text.replace(/\r\n/g, "\n").replace(/\n/g, eol);

function findBlock(text) {
  const start = text.indexOf(BLOCK_START);
  if (start === -1) {
    if (text.includes(BLOCK_END)) return { error: "found an end marker without a start marker" };
    return null;
  }
  const end = text.indexOf(BLOCK_END, start);
  if (end === -1) return { error: "found a start marker without an end marker" };
  if (text.indexOf(BLOCK_START, start + BLOCK_START.length) !== -1 && text.indexOf(BLOCK_START, start + BLOCK_START.length) < end) {
    return { error: "found nested start markers" };
  }
  return { start, end: end + BLOCK_END.length };
}

// Returns { next, action } or { error }. `next` always keeps every character of `text`
// outside the block byte for byte; this is verified before returning.
export function upsertBlock(text, body) {
  const eol = detectEol(text);
  const block = withEol(`${BLOCK_START}\n${body.trim()}\n${BLOCK_END}`, eol);
  const found = findBlock(text);
  if (found?.error) return { error: found.error };

  let next;
  let action;
  if (found) {
    next = text.slice(0, found.start) + block + text.slice(found.end);
    action = "update";
    if (text.slice(0, found.start) !== next.slice(0, found.start)) return { error: "internal check failed" };
  } else {
    const lead = text === "" ? "" : text.endsWith("\n") ? eol : eol + eol;
    next = `${text}${lead}${block}${eol}`;
    action = text === "" ? "create" : "append";
    if (!next.startsWith(text)) return { error: "internal check failed" };
  }
  return { next, action: next === text ? "unchanged" : action };
}

// Removes the block and the single separator the kit added in front of it.
export function removeBlock(text) {
  const found = findBlock(text);
  if (!found) return { next: text, removed: false };
  if (found.error) return { error: found.error };
  const eol = detectEol(text);
  let before = text.slice(0, found.start);
  let after = text.slice(found.end);
  if (after.startsWith(eol)) after = after.slice(eol.length);
  if (before.endsWith(eol + eol)) before = before.slice(0, -eol.length);
  else if (before.endsWith(eol) && after === "") before = before.slice(0, -eol.length);
  return { next: before + after, removed: true };
}

export const BACKUP_SUFFIX = ".fvk-backup";

// Resolve symlinks so we edit the real file; report what we cannot safely touch.
export function resolveTarget(file) {
  const stat = fs.lstatSync(file, { throwIfNoEntry: false });
  if (!stat) return { kind: "missing", path: file };
  let real;
  try {
    real = fs.realpathSync(file);
  } catch {
    return { kind: "dangling", path: file };
  }
  if (!fs.statSync(real).isFile()) return { kind: "not-a-file", path: file };
  return { kind: "file", path: real };
}
