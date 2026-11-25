import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JOBS, jobOf } from "../skills/glass-motion-frontend/scripts/lib/jobs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETUP = path.join(ROOT, "skills", "glass-motion-frontend", "scripts", "setup.mjs");
const CLI = path.join(ROOT, "bin", "cli.mjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "fvk-adapt-"));
const setup = (cwd, args = [], options = {}) =>
  spawnSync(process.execPath, [SETUP, ...args], { cwd, encoding: "utf8", ...options });
const detect = (cwd) => JSON.parse(setup(cwd, ["--detect", "--json"]).stdout);
const write = (dir, file, content = "") => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), typeof content === "string" ? content : JSON.stringify(content));
};
const listing = (dir) =>
  fs.readdirSync(dir, { recursive: true }).map(String).sort().join("\n");

test("every preset package belongs to exactly one job", () => {
  const presets = JSON.parse(fs.readFileSync(path.join(ROOT, "skills", "glass-motion-frontend", "presets.json"), "utf8"));
  const names = Object.values(presets.groups).flatMap((g) => Object.values(g).flat().filter((v) => typeof v === "string"));
  assert.ok(names.length > 10);
  for (const name of names) {
    assert.equal(JOBS.filter((j) => j.skill.includes(name)).length, 1, `${name} must be in exactly one job`);
    assert.ok(jobOf(name));
  }
});

test("detect is read-only and describes a Laravel project", () => {
  const dir = tmp();
  write(dir, "artisan");
  write(dir, "composer.json", { name: "x/y" });
  const before = listing(dir);
  const profile = detect(dir);
  assert.equal(profile.kind, "backend");
  assert.equal(profile.mode, "existing");
  assert.match(profile.label, /Laravel/);
  assert.equal(listing(dir), before, "detect must not write anything");
});

test("setup adapts to a server-side project and installs nothing", () => {
  const dir = tmp();
  write(dir, "manage.py");
  const before = listing(dir);
  const r = setup(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Django/);
  assert.equal(listing(dir), before);
});

test("setup refuses to scaffold a framework into a running project (exit 4) unless approved", () => {
  const dir = tmp();
  write(dir, "composer.json", { name: "x/y" });
  write(dir, "artisan");
  const before = listing(dir);
  const refused = setup(dir, ["--stack", "next"]);
  assert.equal(refused.status, 4);
  assert.match(refused.stderr, /NEEDS_CONFIRMATION/);
  assert.equal(listing(dir), before, "nothing may be written when refused");
  const approved = setup(dir, ["--stack", "next", "--approve", "--dry-run"]);
  assert.equal(approved.status, 0, approved.stderr);
});

test("a static site in public/ is a running project, not an empty folder", () => {
  const dir = tmp();
  write(dir, "public/index.html", "<html></html>");
  assert.equal(detect(dir).kind, "vanilla");
  assert.equal(setup(dir, ["--stack", "next"]).status, 4);
  assert.equal(setup(dir).status, 0);
});

test("unrecognised files are treated as existing: no silent scaffold", () => {
  const dir = tmp();
  write(dir, "notes.txt", "hello");
  assert.equal(detect(dir).kind, "other");
  const ask = setup(dir);
  assert.equal(ask.status, 2);
  assert.match(ask.stderr, /NEEDS_STACK/);
  assert.match(ask.stderr, /notes\.txt/);
  assert.equal(setup(dir, ["--stack", "next"]).status, 4);
  const vanilla = setup(dir, ["--stack", "vanilla"]);
  assert.equal(vanilla.status, 0, vanilla.stderr);
  assert.ok(fs.existsSync(path.join(dir, "notes.txt")), "existing file kept");
});

test("React Native gets no web libraries", () => {
  const dir = tmp();
  write(dir, "package.json", { dependencies: { react: "19.0.0", "react-native": "0.79.0", expo: "53.0.0" } });
  const r = setup(dir, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /lucide-react|sonner|Optional packages/);
  assert.equal(detect(dir).kind, "react-native");
});

test("monorepo root: lists packages, installs nothing, member inherits the root package manager", () => {
  const dir = tmp();
  write(dir, "package.json", { private: true, workspaces: ["apps/*"], devDependencies: { turbo: "2" } });
  write(dir, "apps/web/package.json", { dependencies: { next: "15", react: "19" } });
  write(dir, "pnpm-lock.yaml", "lockfileVersion: 9");
  const root = detect(dir);
  assert.equal(root.kind, "workspace");
  assert.deepEqual(root.members.map((m) => [m.dir, m.kind]), [["apps/web", "next"]]);
  const r = setup(dir);
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /Optional packages/);
  const member = detect(path.join(dir, "apps", "web"));
  assert.equal(member.kind, "next");
  assert.equal(member.packageManager, "pnpm");
});

test("libraries that duplicate a job the project already covers are never offered", () => {
  const dir = tmp();
  write(dir, "package.json", {
    dependencies: {
      react: "18.3.1", "@mui/material": "6", "framer-motion": "11", "react-toastify": "10",
      formik: "2", yup: "1", swr: "2", "react-icons": "5", "react-virtuoso": "4", recharts: "2",
    },
    devDependencies: { vite: "6", eslint: "9", jest: "29" },
  });
  const r = setup(dir, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  const offered = r.stdout.split("Optional packages")[1];
  for (const dup of ["sonner", "react-hook-form", "@hookform/resolvers", "zod", "@tanstack/react-query", "lucide-react", "motion", "@tanstack/react-virtual", "@biomejs/biome", "vitest"]) {
    assert.doesNotMatch(offered, new RegExp(`(^|\\s)${dup.replace(/[/@.]/g, "\\$&")}(\\s|$)`), `${dup} must not be offered`);
  }
  assert.match(r.stdout, /motion skipped: animation already covered by framer-motion/);
  assert.match(offered, /nuqs/, "uncovered jobs are still offered");
});

test("--only approves a subset, and refuses what cannot be offered", () => {
  const dir = tmp();
  const pkg = { dependencies: { react: "18.3.1", "react-toastify": "10" } };
  write(dir, "package.json", pkg);
  const before = fs.readFileSync(path.join(dir, "package.json"), "utf8");

  const duplicate = setup(dir, ["--only", "sonner", "--approve"]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /--only: sonner cannot be offered/);

  const plan = setup(dir, ["--only", "zod", "--dry-run"]);
  assert.equal(plan.status, 0, plan.stderr);
  const offered = plan.stdout.split("Optional packages")[1];
  assert.match(offered, /zod/);
  assert.doesNotMatch(offered, /nuqs|lenis|three/);

  const unapproved = setup(dir, ["--only", "zod"]);
  assert.equal(unapproved.status, 3);
  assert.match(unapproved.stderr, /NEEDS_APPROVAL/);
  assert.equal(fs.readFileSync(path.join(dir, "package.json"), "utf8"), before);
});

test("--only is rejected for a brand-new project", () => {
  const r = setup(tmp(), ["--stack", "next", "--only", "zod", "--dry-run"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--only is for existing projects/);
});

test("a peer-dependency conflict in a running project is explained, never forced", { skip: process.platform === "win32" }, () => {
  const dir = tmp();
  write(dir, "package.json", { dependencies: { react: "19.0.0" }, devDependencies: { "@types/node": "^20" } });
  const bin = tmp();
  const log = path.join(bin, "calls.log");
  write(bin, "npm", `#!/bin/sh\necho "$@" >> "${log}"\necho "npm error code ERESOLVE" >&2\necho "npm error peerOptional @types/node@^22 from vitest" >&2\nexit 1\n`);
  fs.chmodSync(path.join(bin, "npm"), 0o755);
  const r = setup(dir, ["--only", "vitest", "--approve", "--pm", "npm"], {
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /do not force it/);
  assert.match(r.stderr, /@types\/node@\^22/);
  const calls = fs.readFileSync(log, "utf8").trim().split("\n");
  assert.equal(calls.length, 1, "no retry in a running project");
  assert.doesNotMatch(calls[0], /legacy-peer-deps/);
});

test("doctor reports a running project as info, not as failures", () => {
  const dir = tmp();
  write(dir, "package.json", {
    dependencies: { react: "18.3.1", tailwindcss: "3.4.0" },
    devDependencies: { eslint: "9", vite: "6" },
    scripts: { lint: "eslint .", test: "jest" },
  });
  const home = tmp();
  assert.equal(spawnSync(process.execPath, [CLI, "install", "--dir", dir, "--home", home], { encoding: "utf8" }).status, 0);
  const r = spawnSync(process.execPath, [CLI, "doctor", "--dir", dir, "--home", home], { encoding: "utf8" });
  assert.doesNotMatch(r.stdout, /FAIL/);
  assert.doesNotMatch(r.stdout, /WARN.*(eslint|tailwind|react 18)/i);
  assert.match(r.stdout, /eslint is the project's linter/);
  assert.match(r.stdout, /do not upgrade/);
  assert.match(r.stdout, /project lint: npm run lint/);
});
