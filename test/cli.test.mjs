import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "cli.mjs");
const SKILL = "glass-motion-frontend";

const run = (args, options = {}) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", ...options });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "fvk-"));
const skillFile = (...parts) => path.join(...parts, SKILL, "SKILL.md");

test("install (default) writes .claude/skills and .agents/skills", () => {
  const project = tmp();
  const home = tmp();
  const r = run(["install", "--dir", project, "--home", home]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(skillFile(project, ".claude", "skills")));
  assert.ok(fs.existsSync(skillFile(project, ".agents", "skills")));
  assert.ok(fs.existsSync(path.join(project, ".claude", "skills", SKILL, "references", "recipes.md")));
  assert.ok(!fs.existsSync(path.join(project, ".opencode")), "opencode copy only on request");
});

test("install --agent opencode writes .opencode/skills", () => {
  const project = tmp();
  const r = run(["install", "--agent", "opencode", "--dir", project, "--home", tmp()]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(skillFile(project, ".opencode", "skills")));
});

test("install --global writes to the home directory", () => {
  const home = tmp();
  const r = run(["install", "--global", "--agent", "all", "--home", home, "--dir", tmp()]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(skillFile(home, ".claude", "skills")));
  assert.ok(fs.existsSync(skillFile(home, ".codex", "skills")));
  assert.ok(fs.existsSync(skillFile(home, ".gemini", "config", "skills")));
});

test("dry run changes nothing", () => {
  const project = tmp();
  const r = run(["install", "--dry-run", "--with-agents-md", "--dir", project, "--home", tmp()]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fs.readdirSync(project), []);
});

test("unknown agent and unknown command fail with exit code 1", () => {
  assert.equal(run(["install", "--agent", "nope", "--dir", tmp()]).status, 1);
  assert.equal(run(["explode"]).status, 1);
});

test("--with-agents-md is idempotent and preserves existing content", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# My rules\n\nKeep it short.\n");
  for (let i = 0; i < 2; i++) {
    const r = run(["install", "--with-agents-md", "--dir", project, "--home", tmp()]);
    assert.equal(r.status, 0, r.stderr);
  }
  const text = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.match(text, /Keep it short\./);
  assert.equal(text.split(`<!-- ${SKILL}:start -->`).length - 1, 1);
  assert.equal(fs.readFileSync(path.join(project, "CLAUDE.md"), "utf8").trim(), "@AGENTS.md");

  const u = run(["uninstall", "--with-agents-md", "--dir", project, "--home", tmp()]);
  assert.equal(u.status, 0, u.stderr);
  const after = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.match(after, /Keep it short\./);
  assert.ok(!after.includes(`${SKILL}:start`));
});

test("doctor passes after install and reports missing packages", () => {
  const project = tmp();
  const home = tmp();
  fs.writeFileSync(
    path.join(project, "package.json"),
    JSON.stringify({ dependencies: { react: "^19.0.0", tailwindcss: "^4.0.0", sonner: "^2.0.0" } }),
  );
  assert.equal(run(["install", "--dir", project, "--home", home]).status, 0);
  const r = run(["doctor", "--dir", project, "--home", home]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /package\(s\) missing/);
  assert.match(r.stdout, /0 failure\(s\)/);
});

test("doctor fails when the skill is not installed", () => {
  const r = run(["doctor", "--dir", tmp(), "--home", tmp()]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /not installed/);
});

test("uninstall removes installed copies", () => {
  const project = tmp();
  const home = tmp();
  run(["install", "--dir", project, "--home", home]);
  const r = run(["uninstall", "--dir", project, "--home", home]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(project, ".claude", "skills", SKILL)));
  assert.ok(!fs.existsSync(path.join(project, ".agents", "skills", SKILL)));
});

test("setup --dry-run prints the install plan for each preset", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "package.json"), "{}");
  const full = run(["setup", "--dry-run", "--pm", "pnpm", "--dir", project]);
  assert.equal(full.status, 0, full.stderr);
  assert.match(full.stdout, /pnpm add .*sonner/);
  assert.match(full.stdout, /@react-three\/fiber/);
  assert.match(full.stdout, /@biomejs\/biome/);

  const lite = run(["setup", "--dry-run", "--preset", "lite", "--pm", "npm", "--dir", project]);
  assert.equal(lite.status, 0, lite.stderr);
  assert.doesNotMatch(lite.stdout, /three/);
  assert.doesNotMatch(lite.stdout, /vitest/);
  assert.match(lite.stdout, /npm install/);

  assert.equal(run(["setup", "--dry-run", "--preset", "nope", "--dir", project]).status, 1);
});

// ---- Safety: never overwrite what the user already has ---------------------

test("a second install is a no-op ('up to date')", () => {
  const project = tmp();
  const home = tmp();
  run(["install", "--dir", project, "--home", home]);
  const r = run(["install", "--dir", project, "--home", home]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /up to date/);
});

test("locally edited skill is NOT overwritten without --force", () => {
  const project = tmp();
  const home = tmp();
  run(["install", "--dir", project, "--home", home]);
  const file = path.join(project, ".claude", "skills", SKILL, "SKILL.md");
  fs.appendFileSync(file, "\nMY LOCAL NOTE\n");
  const r = run(["install", "--dir", project, "--home", home]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Use --force/);
  assert.match(fs.readFileSync(file, "utf8"), /MY LOCAL NOTE/);

  const forced = run(["install", "--force", "--dir", project, "--home", home]);
  assert.equal(forced.status, 0, forced.stderr);
  assert.doesNotMatch(fs.readFileSync(file, "utf8"), /MY LOCAL NOTE/);
});

test("extra files the user added inside the skill folder are protected too", () => {
  const project = tmp();
  const home = tmp();
  run(["install", "--dir", project, "--home", home]);
  const extra = path.join(project, ".claude", "skills", SKILL, "my-notes.md");
  fs.writeFileSync(extra, "keep me");
  const r = run(["install", "--dir", project, "--home", home]);
  assert.equal(r.status, 1);
  assert.ok(fs.existsSync(extra));
  assert.equal(run(["uninstall", "--dir", project, "--home", home]).status, 1);
  assert.ok(fs.existsSync(extra));
});

test("a different pre-existing skill with the same name is not overwritten", () => {
  const project = tmp();
  const dest = path.join(project, ".claude", "skills", SKILL);
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "SKILL.md"), "---\nname: glass-motion-frontend\ndescription: mine\n---\nMine\n");
  const r = run(["install", "--agent", "claude", "--dir", project, "--home", tmp()]);
  assert.equal(r.status, 1);
  assert.match(fs.readFileSync(path.join(dest, "SKILL.md"), "utf8"), /Mine/);
});

test("install never touches unrelated project files", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "package.json"), '{"name":"keep"}');
  fs.writeFileSync(path.join(project, "CLAUDE.md"), "# my claude file\n");
  fs.mkdirSync(path.join(project, ".claude", "skills", "other-skill"), { recursive: true });
  fs.writeFileSync(path.join(project, ".claude", "skills", "other-skill", "SKILL.md"), "other");
  const r = run(["install", "--with-agents-md", "--dir", project, "--home", tmp()]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(project, "package.json"), "utf8"), '{"name":"keep"}');
  assert.equal(fs.readFileSync(path.join(project, "CLAUDE.md"), "utf8"), "# my claude file\n");
  assert.equal(fs.readFileSync(path.join(project, ".claude", "skills", "other-skill", "SKILL.md"), "utf8"), "other");
  assert.match(r.stdout, /@AGENTS\.md/);
});

test("setup leaves packages already in package.json untouched", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ dependencies: { sonner: "1.0.0", zod: "^3.0.0" } }));
  const r = run(["setup", "--dry-run", "--pm", "npm", "--dir", project]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /left untouched: .*sonner/);
  const addLines = r.stdout.split("\n").filter((l) => l.startsWith("$ npm install"));
  assert.ok(addLines.length > 0);
  for (const line of addLines) assert.doesNotMatch(line, /\bsonner\b|\bzod\b/);
});

test("setup without package.json explains what to do", () => {
  const r = run(["setup", "--dir", tmp()]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /create-next-app/);
});
