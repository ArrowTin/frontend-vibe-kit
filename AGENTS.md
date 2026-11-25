# Frontend rules for AI coding agents

Read by Codex, OpenCode, Antigravity, Claude Code (via CLAUDE.md) and any tool that supports AGENTS.md.

## When building or changing UI
1. Load and follow the `glass-motion-frontend` skill (`.agents/skills/` or `.claude/skills/`). If your tool cannot load skills, read `skills/glass-motion-frontend/SKILL.md` directly.
2. Existing, running projects win: adapt to them. Never install, replace, upgrade or migrate a framework, UI kit, CSS framework, library, linter, test runner or bundler on your own. Reuse what the project has. If something truly required is missing, name the exact packages and why, ask the user once, and install only after approval (`setup.mjs --only <names> --approve`; never pass `--approve` without the user's yes).
3. Detect first, read-only: `node <skill-folder>/scripts/setup.mjs --detect`. Route by what it says. React or Next.js: follow the workflow with the project's own libraries. Vue, Svelte, Angular, Astro and other non-React projects, and server-side projects (Laravel, Django, Rails, WordPress, static sites): keep the stack and use `references/vanilla.md` and `references/adapt.md`. Monorepo root: pick a package, use `--dir`. Empty folder only: ask the user which of the three they want (Next.js, Vite + React, plain HTML/CSS/JS), never choose for them, then run `scripts/setup.mjs --stack <next|vite|vanilla>`. Never scaffold a framework into a folder that already holds a project (setup refuses with exit 4).
4. Write the design plan (palette, type, depth model, signature moment, motion budget) before any code.
5. New React projects, or jobs the project does not cover yet: use only the approved libraries for each job: coss ui, Magic UI, Tremor, Lucide, unDraw, React Hook Form, TanStack (Query, Table, Virtual), Sonner, nuqs. Add `motion`, `lenis` and three.js packages only when the plan needs them.
6. Never add a second library for a job that is already covered.
7. Read the library docs or registry item before using a component. Do not invent props.

## Before saying "done"
Run the project's own checks (the scripts `--detect` lists: lint, typecheck, test, e2e, build) with its package manager, and compare with the baseline you took before editing: do not add failures. In a new project run `biome check --write .`, `tsc --noEmit`, `vitest run`, `playwright test`, `build`. A check the project does not have is reported as not run; never install a tool just to pass a gate. In an existing project format only the files you touched. Look at the screenshots. Report what passed, what already failed, and what was left out.

## Non-negotiables
- Respect `prefers-reduced-motion`.
- Animate `transform` and `opacity` only.
- One `<Canvas>` per page, lazy-loaded, with a static poster fallback.
- Keyboard focus visible on every interactive element.
- Loading, empty and error states for every data view.
- Linting: Biome in new projects; in an existing project its own linter and formatter. Never add a second one. No React Scan in production.
