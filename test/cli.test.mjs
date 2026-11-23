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
