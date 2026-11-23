#!/usr/bin/env node
// Replace the OWNER placeholder with your GitHub username (and optionally the repo name).
//   npm run set-owner -- your-username [repo-name]
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../bin/lib.mjs";

const [user, repo = "frontend-vibe-kit"] = process.argv.slice(2);
if (!user || !/^[A-Za-z0-9-]+$/.test(user) || !/^[A-Za-z0-9._-]+$/.test(repo)) {
  console.error("Usage: npm run set-owner -- <github-username> [repo-name]");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(md|json|mjs|yml|yaml)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (path.basename(file) === "set-owner.mjs") continue;
  const text = fs.readFileSync(file, "utf8");
  const next = text.replaceAll("OWNER/frontend-vibe-kit", `${user}/${repo}`).replaceAll("github.com/OWNER", `github.com/${user}`);
  if (next !== text) {
    fs.writeFileSync(file, next);
    changed++;
    console.log(`updated ${path.relative(ROOT, file)}`);
  }
}
console.log(changed ? `Done: ${changed} file(s).` : "Nothing to replace (already set?).");
