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
  const claudeText = fs.readFileSync(path.join(project, "CLAUDE.md"), "utf8");
  assert.match(claudeText, /@AGENTS\.md/);
  assert.equal(claudeText.split(`<!-- ${SKILL}:start -->`).length - 1, 1);

  const u = run(["uninstall", "--with-agents-md", "--dir", project, "--home", tmp()]);
  assert.equal(u.status, 0, u.stderr);
  const after = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.match(after, /Keep it short\./);
  assert.ok(!after.includes(`${SKILL}:start`));
  assert.equal(after, "# My rules\n\nKeep it short.\n", "uninstall restores the original text");
  assert.ok(!fs.existsSync(path.join(project, "CLAUDE.md")), "kit-created CLAUDE.md is removed");
  assert.ok(!fs.existsSync(path.join(project, `AGENTS.md${".fvk-backup"}`)), "identical backup is cleaned up");
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
  fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  const full = run(["setup", "--dry-run", "--pm", "pnpm", "--dir", project]);
  assert.equal(full.status, 0, full.stderr);
  assert.match(full.stdout, /sonner/);
  assert.match(full.stdout, /@react-three\/fiber/);
  assert.match(full.stdout, /@biomejs\/biome/);
  assert.match(full.stdout, /nothing installed/);

  const lite = run(["setup", "--dry-run", "--preset", "lite", "--pm", "npm", "--dir", project]);
  assert.equal(lite.status, 0, lite.stderr);
  assert.doesNotMatch(lite.stdout, /three/);
  assert.doesNotMatch(lite.stdout, /vitest/);

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
  const claude = fs.readFileSync(path.join(project, "CLAUDE.md"), "utf8");
  assert.ok(claude.startsWith("# my claude file\n"), "user text stays first and untouched");
  assert.match(claude, /@AGENTS\.md/);
  assert.equal(fs.readFileSync(path.join(project, ".claude", "skills", "other-skill", "SKILL.md"), "utf8"), "other");
});

test("setup leaves packages already in package.json untouched", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0", sonner: "1.0.0", zod: "^3.0.0" } }));
  const r = run(["setup", "--dry-run", "--pm", "npm", "--dir", project]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /left untouched: .*sonner/);
  const offered = r.stdout.split("Optional packages")[1] ?? "";
  assert.ok(offered.length > 0);
  assert.doesNotMatch(offered, /\bsonner\b|\bzod\b/);
});

test("setup in an empty folder (no TTY) asks for a stack instead of failing blindly", () => {
  const dir = tmp();
  const r = run(["setup", "--dir", dir], { input: "" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /NEEDS_STACK/);
  assert.match(r.stderr, /--stack next/);
  assert.match(r.stderr, /--stack vite/);
  assert.match(r.stderr, /--stack vanilla/);
  assert.deepEqual(fs.readdirSync(dir), [], "nothing was created");
});

test("setup rejects an unknown stack", () => {
  const r = run(["setup", "--stack", "angular", "--dir", tmp()]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Unknown stack/);
});

// ---- AGENTS.md / CLAUDE.md safety ------------------------------------------------------------

const BLOCK_START = `<!-- ${SKILL}:start -->`;
const withAgents = (project, extra = []) =>
  run(["install", "--with-agents-md", "--agent", "claude", "--dir", project, "--home", tmp(), ...extra]);

test("AGENTS.md: your text is kept byte for byte, with a backup of the original", () => {
  const project = tmp();
  const original = "# Team rules\n\n- Be kind\n- Ship small\n\n\n";
  fs.writeFileSync(path.join(project, "AGENTS.md"), original);
  const r = withAgents(project);
  assert.equal(r.status, 0, r.stderr);
  const text = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.ok(text.startsWith(original), "original text is a prefix of the new file");
  assert.equal(fs.readFileSync(path.join(project, "AGENTS.md.fvk-backup"), "utf8"), original);
});

test("AGENTS.md: --no-backup skips the backup file", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# mine\n");
  assert.equal(withAgents(project, ["--no-backup"]).status, 0);
  assert.ok(!fs.existsSync(path.join(project, "AGENTS.md.fvk-backup")));
});

test("AGENTS.md: CRLF files stay CRLF and text without a final newline is not glued to the block", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# mine\r\nno newline at end");
  assert.equal(withAgents(project).status, 0);
  const text = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.ok(text.startsWith("# mine\r\nno newline at end\r\n\r\n<!--"), JSON.stringify(text.slice(0, 60)));
  assert.ok(!/[^\r]\n/.test(text), "no bare LF inside a CRLF file");
});

test("AGENTS.md: damaged markers stop the install instead of guessing", () => {
  const project = tmp();
  const broken = `# mine\n${BLOCK_START}\nhalf a block, user edited the end marker away\n`;
  fs.writeFileSync(path.join(project, "AGENTS.md"), broken);
  const r = withAgents(project);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /markers are damaged/);
  assert.equal(fs.readFileSync(path.join(project, "AGENTS.md"), "utf8"), broken);
});

test("AGENTS.md: re-running updates only the block and leaves later edits alone", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# top\n");
  assert.equal(withAgents(project).status, 0);
  const file = path.join(project, "AGENTS.md");
  fs.appendFileSync(file, "\n## Added by me later\nkeep this\n");
  const before = fs.readFileSync(file, "utf8");
  const r = withAgents(project);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(file, "utf8"), before);
  assert.match(r.stdout, /up to date/);
});

test("CLAUDE.md that is a symlink to AGENTS.md is not edited twice", { skip: process.platform === "win32" }, () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# mine\n");
  fs.symlinkSync("AGENTS.md", path.join(project, "CLAUDE.md"));
  const r = withAgents(project);
  assert.equal(r.status, 0, r.stderr);
  const text = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.equal(text.split(BLOCK_START).length - 1, 1);
  assert.doesNotMatch(text, /^@AGENTS\.md$/m, "no self-import loop");
});

test("CLAUDE.md that already imports @AGENTS.md is left alone", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "CLAUDE.md"), "# mine\n@AGENTS.md\n");
  assert.equal(withAgents(project).status, 0);
  assert.equal(fs.readFileSync(path.join(project, "CLAUDE.md"), "utf8"), "# mine\n@AGENTS.md\n");
});

test("--dry-run with --with-agents-md on existing files changes nothing", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# mine\n");
  fs.writeFileSync(path.join(project, "CLAUDE.md"), "# mine too\n");
  const r = withAgents(project, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(project, "AGENTS.md"), "utf8"), "# mine\n");
  assert.equal(fs.readFileSync(path.join(project, "CLAUDE.md"), "utf8"), "# mine too\n");
  assert.deepEqual(fs.readdirSync(project).sort(), ["AGENTS.md", "CLAUDE.md"]);
});

// ---- Empty folder: install anyway, then choose a stack ---------------------------------------

test("install in an empty folder works and points to setup", () => {
  const project = tmp();
  const r = run(["install", "--agent", "claude", "--dir", project, "--home", tmp()]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(skillFile(project, ".claude", "skills")));
  assert.match(r.stdout, /no project in this folder yet/);
  assert.match(r.stdout, /setup --stack vanilla/);
});

test("setup --stack vanilla builds a plain project and never overwrites existing files", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# mine\n");
  fs.writeFileSync(path.join(project, "index.html"), "<!-- my page -->");
  fs.mkdirSync(path.join(project, ".claude"));
  const r = run(["setup", "--stack", "html", "--dir", project]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(project, "index.html"), "utf8"), "<!-- my page -->");
  assert.equal(fs.readFileSync(path.join(project, "AGENTS.md"), "utf8"), "# mine\n");
  assert.ok(fs.existsSync(path.join(project, "css", "styles.css")));
  assert.ok(fs.existsSync(path.join(project, "js", "main.js")));
  assert.ok(!fs.existsSync(path.join(project, "package.json")), "no npm for the no-framework stack");
  assert.match(r.stdout, /nothing was overwritten/);
});

test("setup --stack vanilla on an empty folder (with kit files already installed)", () => {
  const project = tmp();
  assert.equal(run(["install", "--with-agents-md", "--agent", "claude", "--dir", project, "--home", tmp()]).status, 0);
  const r = run(["setup", "--stack", "vanilla", "--dir", project]);
  assert.equal(r.status, 0, r.stderr);
  for (const file of ["index.html", "css/styles.css", "js/main.js"]) {
    assert.ok(fs.existsSync(path.join(project, file)), file);
  }
  assert.match(fs.readFileSync(path.join(project, "AGENTS.md"), "utf8"), new RegExp(BLOCK_START));
});

test("setup on a plain HTML project (index.html, no package.json) installs nothing", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "index.html"), "<h1>hi</h1>");
  const r = run(["setup", "--dir", project]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /plain HTML project/);
  assert.deepEqual(fs.readdirSync(project), ["index.html"]);
});

test("setup --stack next|vite --dry-run shows the plan and writes nothing", () => {
  for (const stack of ["next", "vite"]) {
    const project = tmp();
    const r = run(["setup", "--stack", stack, "--dry-run", "--pm", "pnpm", "--dir", project]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, stack === "next" ? /create-next-app/ : /create-vite/);
    assert.match(r.stdout, /pnpm add .*sonner/);
    assert.deepEqual(fs.readdirSync(project), []);
  }
  const vite = run(["setup", "--stack", "vite", "--dry-run", "--dir", tmp()]);
  assert.match(vite.stdout, /@tailwindcss\/vite/);
});

test("setup ignores --stack when package.json already exists", () => {
  const project = tmp();
  fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));
  const r = run(["setup", "--stack", "vanilla", "--dry-run", "--dir", project]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /--stack vanilla is ignored/);
});

test("doctor understands plain HTML and empty projects", () => {
  const home = tmp();
  const plain = tmp();
  fs.writeFileSync(path.join(plain, "index.html"), "<h1>x</h1>");
  run(["install", "--agent", "claude", "--dir", plain, "--home", home]);
  const a = run(["doctor", "--dir", plain, "--home", home]);
  assert.equal(a.status, 0, a.stdout);
  assert.match(a.stdout, /no-framework mode/);
  assert.doesNotMatch(a.stdout, /tailwindcss is not a dependency/);

  const empty = tmp();
  run(["install", "--agent", "claude", "--dir", empty, "--home", home]);
  const b = run(["doctor", "--dir", empty, "--home", home]);
  assert.match(b.stdout, /no project yet/);
});

// ---- Existing projects: adapt, never install without approval -----------------------------------

const pkgProject = (deps) => {
  const dir = tmp();
  const file = path.join(dir, "package.json");
  fs.writeFileSync(file, JSON.stringify({ name: "keep", dependencies: deps }));
  return { dir, file, before: fs.readFileSync(file, "utf8") };
};

test("existing React project: setup lists packages but installs nothing without approval", () => {
  const { dir, file, before } = pkgProject({ react: "^19.0.0" });
  const r = run(["setup", "--dir", dir, "--pm", "npm"], { input: "" });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /NEEDS_APPROVAL/);
  assert.match(r.stdout, /Optional packages/);
  assert.equal(fs.readFileSync(file, "utf8"), before);
  assert.deepEqual(fs.readdirSync(dir), ["package.json"]);
});

test("existing Vue project is kept: no React libraries are offered, nothing installed", () => {
  const { dir, file, before } = pkgProject({ vue: "^3.0.0" });
  const r = run(["setup", "--dir", dir, "--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Vue/);
  assert.match(r.stdout, /no framework is installed or changed/);
  assert.doesNotMatch(r.stdout, /react-hook-form|sonner|lucide-react|@react-three|nuqs/);
  assert.equal(fs.readFileSync(file, "utf8"), before);
});

test("tools that duplicate the project's own are not offered (ESLint, Jest)", () => {
  const { dir } = pkgProject({ react: "^19.0.0", eslint: "^9.0.0", jest: "^29.0.0" });
  const r = run(["setup", "--dir", dir, "--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  const offered = r.stdout.split("Optional packages")[1] ?? "";
  assert.doesNotMatch(offered, /@biomejs\/biome|vitest|jsdom/);
  assert.match(r.stdout, /@biomejs\/biome skipped/);
});

test("existing project with everything present: nothing to add", () => {
  const all = {};
  const presets = JSON.parse(fs.readFileSync(path.join(ROOT, "skills", SKILL, "presets.json"), "utf8"));
  for (const group of presets.presets.lite.groups) {
    const g = presets.groups[group];
    for (const key of ["dependencies", "devDependencies", "devDependenciesExact"]) for (const n of g[key] ?? []) all[n] = "1.0.0";
  }
  const { dir } = pkgProject({ react: "^19.0.0", ...all });
  const r = run(["setup", "--preset", "lite", "--dir", dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Nothing to add/);
});

test("doctor treats a Vue project as adapt mode, not as a failure", () => {
  const home = tmp();
  const { dir } = pkgProject({ vue: "^3.0.0" });
  run(["install", "--agent", "claude", "--dir", dir, "--home", home]);
  const r = run(["doctor", "--dir", dir, "--home", home]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /adapts to it/);
  assert.doesNotMatch(r.stdout, /react is not a dependency/);
});
