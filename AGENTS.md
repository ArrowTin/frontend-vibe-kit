# Frontend rules for AI coding agents

Read by Codex, OpenCode, Antigravity, Claude Code (via CLAUDE.md) and any tool that supports AGENTS.md.

## When building or changing UI
1. Load and follow the `glass-motion-frontend` skill (`.agents/skills/` or `.claude/skills/`). If your tool cannot load skills, read `skills/glass-motion-frontend/SKILL.md` directly.
2. Existing, running projects win: adapt to them. Never install, replace or migrate a framework, UI kit, CSS framework, library, linter or test runner on your own. Reuse what the project has. If something truly required is missing, name the exact packages, ask the user once, and install only after approval.
3. Detect the stack first. React or Next.js: follow the workflow, using the project's own libraries where it has them. Vue, Svelte, Angular, Astro and other non-React projects: keep the framework, use the plain-CSS guidance in `references/vanilla.md`. No framework (plain HTML, CSS, JS, no `package.json`): the no-framework mode in the same file. Empty folder: ask the user which of the three they want (Next.js, Vite + React, plain HTML/CSS/JS), never choose for them, then run the skill's `scripts/setup.mjs --stack <next|vite|vanilla>` from the project root.
4. Write the design plan (palette, type, depth model, signature moment, motion budget) before any code.
5. New React projects, or jobs the project does not cover yet: use only the approved libraries for each job: coss ui, Magic UI, Tremor, Lucide, unDraw, React Hook Form, TanStack (Query, Table, Virtual), Sonner, nuqs. Add `motion`, `lenis` and three.js packages only when the plan needs them.
6. Never add a second library for a job that is already covered.
7. Read the library docs or registry item before using a component. Do not invent props.

## Before saying "done"
Run the checks the project has, in order, with the project's own package manager (pnpm, npm, yarn or bun): `biome check --write .`, `tsc --noEmit`, `vitest run`, `playwright test`, `build`. Skip a step only when the project has no such tool (a plain HTML project has no `tsc` or `build`). Look at the Playwright screenshots. Report what passed and what was left out.

## Non-negotiables
- Respect `prefers-reduced-motion`.
- Animate `transform` and `opacity` only.
- One `<Canvas>` per page, lazy-loaded, with a static poster fallback.
- Keyboard focus visible on every interactive element.
- Loading, empty and error states for every data view.
- No ESLint or Prettier; Biome only. No React Scan in production.
