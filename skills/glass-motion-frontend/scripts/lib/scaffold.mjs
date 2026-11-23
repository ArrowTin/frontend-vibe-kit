// Post-processing of freshly generated Next.js / Vite templates (always run on a TEMP copy,
// never on the user's folder) so they match what the skill expects: Tailwind v4, "@/" alias, Biome.
import fs from "node:fs";
import path from "node:path";

export function safePackageName(folderName) {
  const name = String(folderName)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return name || "my-app";
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function setPackageName(appDir, name) {
  const file = path.join(appDir, "package.json");
  const pkg = readJson(file);
  pkg.name = name;
  writeJson(file, pkg);
}

const VITE_CONFIG = `import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
`;

const VITE_APP = `export default function App() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <h1 className="text-3xl font-semibold">Ready to build</h1>
    </main>
  );
}
`;

// Returns a list of warnings for the things that could not be patched automatically.
export function patchViteTemplate(appDir, name) {
  const warnings = [];
  const at = (...p) => path.join(appDir, ...p);

  fs.writeFileSync(at("vite.config.ts"), VITE_CONFIG);
  fs.writeFileSync(at("src", "index.css"), '@import "tailwindcss";\n');
  fs.writeFileSync(at("src", "App.tsx"), VITE_APP);
  fs.rmSync(at("src", "App.css"), { force: true });
  fs.rmSync(at("src", "assets"), { recursive: true, force: true });
  fs.rmSync(at(".oxlintrc.json"), { force: true });

  // "@/*" alias: shadcn / coss ui read it from tsconfig.json AND tsconfig.app.json.
  const alias = '"paths": { "@/*": ["./src/*"] }';
  const root = at("tsconfig.json");
  const rootText = fs.readFileSync(root, "utf8");
  if (rootText.includes('"files": [],')) {
    fs.writeFileSync(root, rootText.replace('"files": [],', `"files": [],\n  "compilerOptions": { ${alias} },`));
  } else warnings.push('tsconfig.json: add { "compilerOptions": { "paths": { "@/*": ["./src/*"] } } } by hand');

  const app = at("tsconfig.app.json");
  const appText = fs.readFileSync(app, "utf8");
  if (appText.includes('"compilerOptions": {')) {
    fs.writeFileSync(app, appText.replace('"compilerOptions": {', `"compilerOptions": {\n    ${alias},`));
  } else warnings.push('tsconfig.app.json: add "paths": { "@/*": ["./src/*"] } to compilerOptions by hand');

  const html = at("index.html");
  if (fs.existsSync(html)) {
    fs.writeFileSync(html, fs.readFileSync(html, "utf8").replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`));
  }

  // The kit uses Biome only.
  const pkg = readJson(at("package.json"));
  if (pkg.devDependencies) delete pkg.devDependencies.oxlint;
  pkg.scripts = { ...pkg.scripts, lint: "biome check", format: "biome format --write" };
  writeJson(at("package.json"), pkg);

  return warnings;
}

// Packages the Vite template needs on top of the preset to get Tailwind v4 working.
export const VITE_EXTRA_DEPENDENCIES = ["tailwindcss", "@tailwindcss/vite"];
