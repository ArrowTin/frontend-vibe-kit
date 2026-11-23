# Frontend rules for AI coding agents

Read by Codex, OpenCode, Antigravity, Claude Code (via CLAUDE.md) and any tool that supports AGENTS.md.

## When building or changing UI
1. Load and follow the `glass-motion-frontend` skill (`.agents/skills/` or `.claude/skills/`). If your tool cannot load skills, read `skills/glass-motion-frontend/SKILL.md` directly.
2. Write the design plan (palette, type, depth model, signature moment, motion budget) before any code.
3. Use only the approved libraries for each job: coss ui, Magic UI, Tremor, Lucide, unDraw, React Hook Form, TanStack (Query, Table, Virtual), Sonner, nuqs. Add `motion`, `lenis` and three.js packages only when the plan needs them.
4. Never add a second library for a job that is already covered.
5. Read the library docs or registry item before using a component. Do not invent props.

## Before saying "done"
Run, in order: `pnpm biome check --write .`, `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm exec playwright test`, `pnpm build`. Look at the Playwright screenshots. Report what passed and what was left out.

## Non-negotiables
- Respect `prefers-reduced-motion`.
- Animate `transform` and `opacity` only.
- One `<Canvas>` per page, lazy-loaded, with a static poster fallback.
- Keyboard focus visible on every interactive element.
- Loading, empty and error states for every data view.
- No ESLint or Prettier; Biome only. No React Scan in production.
