// Resolve a preset name into flat dependency lists. Shared by setup.mjs and the repo CLI.
export function resolvePreset(data, name) {
  const preset = data.presets?.[name];
  if (!preset) {
    const names = Object.keys(data.presets ?? {}).join(", ");
    throw new Error(`Unknown preset "${name}". Available: ${names}`);
  }
  const out = { dependencies: [], devDependencies: [], devDependenciesExact: [] };
  for (const groupName of preset.groups) {
    const group = data.groups?.[groupName];
    if (!group) throw new Error(`Preset "${name}" references missing group "${groupName}"`);
    for (const key of Object.keys(out)) {
      for (const pkg of group[key] ?? []) {
        if (!out[key].includes(pkg)) out[key].push(pkg);
      }
    }
  }
  return out;
}
