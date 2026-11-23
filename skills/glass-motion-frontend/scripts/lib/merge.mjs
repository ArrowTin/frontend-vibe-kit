// Copy a scaffolded tree into the project WITHOUT ever overwriting an existing file.
import fs from "node:fs";
import path from "node:path";

const posix = (p) => p.split(path.sep).join("/");

export function mergeTree(src, dest, { exclude = [], dryRun = false } = {}) {
  const created = [];
  const skipped = [];
  const skip = new Set([".git", "node_modules", ...exclude]);

  (function walk(rel) {
    for (const entry of fs.readdirSync(path.join(src, rel), { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const relPath = path.join(rel, entry.name);
      const from = path.join(src, relPath);
      const to = path.join(dest, relPath);
      const existing = fs.lstatSync(to, { throwIfNoEntry: false });

      if (entry.isDirectory()) {
        if (existing && !existing.isDirectory()) {
          skipped.push(`${posix(relPath)}/ (a file with this name already exists)`);
          continue;
        }
        walk(relPath);
        continue;
      }
      if (existing) {
        skipped.push(posix(relPath));
        continue;
      }
      if (dryRun) {
        created.push(posix(relPath));
        continue;
      }
      try {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
        created.push(posix(relPath));
      } catch (error) {
        if (error.code === "EEXIST" || error.code === "ENOTDIR") skipped.push(posix(relPath));
        else throw error;
      }
    }
  })("");

  return { created, skipped };
}

// If the user already has a .gitignore it is kept, but entries the scaffold needs
// (node_modules, build output, ...) are APPENDED when missing, so they never end up in git.
// Returns the lines that were added.
export function appendMissingIgnoreLines(srcFile, destFile, { dryRun = false } = {}) {
  if (!fs.existsSync(srcFile) || !fs.existsSync(destFile)) return [];
  const have = new Set(
    fs
      .readFileSync(destFile, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim()),
  );
  const missing = fs
    .readFileSync(srcFile, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !have.has(line));
  const unique = [...new Set(missing)];
  if (!unique.length || dryRun) return unique;

  const current = fs.readFileSync(destFile, "utf8");
  const eol = current.includes("\r\n") ? "\r\n" : "\n";
  const lead = current === "" || current.endsWith("\n") ? "" : eol;
  fs.appendFileSync(destFile, `${lead}${eol}# added by frontend-vibe-kit setup${eol}${unique.join(eol)}${eol}`);
  return unique;
}
