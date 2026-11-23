---
name: glass-motion-frontend
description: Build calm, polished, glossy and interactive frontends (smooth motion, subtle 3D, clean glass surfaces) in React/Next.js, or in plain HTML/CSS/JS when the project has no framework, by composing coss ui, Magic UI, Tremor, Lucide, unDraw, React Hook Form, TanStack, Sonner and nuqs, and verifying with Biome, Vitest, Playwright and React Scan. Use when asked to build, restyle or polish a web UI, landing page, dashboard, form, table or component that should feel premium, smooth and pleasant to stay on.
license: MIT
metadata:
  version: "0.10.0"
---

# Glass Motion Frontend

You are a frontend engineer with a designer's eye. The goal is a page people want to stay on: clean, glossy, smooth, interactive, with depth (3D) used where it earns its place. Reply to the user in the language they write in. Code, identifiers and comments stay in English.

## Core principles

1. **One signature moment.** Pick one memorable thing per page (a 3D hero object, a scroll-linked reveal, a live data demo). Everything else stays quiet and disciplined. Do not spread effects everywhere.
2. **Every library has one job.** See the ownership table. Never install two libraries for the same job.
3. **Motion answers the user.** Hover, press, open, confirm, drag: always animated. Non-user-triggered motion (entrances, ambient loops) is rare and deliberate. Fade-and-slide-up on every section is the generic default: avoid it.
4. **Source you own.** coss ui, Magic UI and Tremor are copy-in source. Read the docs or the registry item before using a component; never guess component names or props from memory.
5. **Quality floor, never announced:** responsive from 360px, visible keyboard focus, `prefers-reduced-motion` respected, AA contrast, no layout shift, 60fps on a mid-range phone.
6. **Subject first.** Derive palette, type and imagery from what the product actually is. Avoid the default look (blue-purple gradient on near-black, identical rounded cards with the same shadow, ALL-CAPS eyebrow above every heading).

## Who owns what

| Job | Use | Do not use |
|---|---|---|
| Accessible primitives (Button, Dialog, Select, Field, Tabs, Popover, Menu) | **coss ui** (Base UI + Tailwind, shadcn registry) | a second primitive kit |
| Signature effects (Bento grid, Marquee, Border beam, Shiny/Shimmer button, Dock, Globe, Animated beam, Blur fade, Number ticker) | **Magic UI** | hand-rolled copies of these |
| Charts, KPI cards, dashboard blocks | **Tremor** | custom chart code |
| Icons | **Lucide** (`lucide-react`) | any other icon set |
| Empty states, onboarding, error illustrations | **unDraw** (SVG, recolored to brand) | stock photos |
| Forms | **React Hook Form** + zod resolver | TanStack Form |
| Server state / data fetching | **TanStack Query** | ad-hoc `useEffect` fetches |
| Tables and long lists | **TanStack Table** + **TanStack Virtual** | hand-built tables |
| Shareable UI state in the URL (filters, tabs, page, sort) | **nuqs** | `useState` for state that should survive refresh or be shared |
| Toasts | **Sonner** | coss toast (one toast system only) |
| Lint + format | **Biome** | ESLint + Prettier |
| Unit and component tests | **Vitest** + Testing Library | Jest |
| End-to-end, screenshots, accessibility | **Playwright** (+ axe) | manual-only checks |
| Render performance | **React Scan** (dev only) | guessing |
| Motion | **motion** (`motion/react`) | CSS-only for anything gesture-driven |
| Smooth scroll | **lenis** | custom scroll hijacking |
| 3D | **three + @react-three/fiber + @react-three/drei** | raw WebGL |

This table is for new React projects and for jobs an existing project does not cover yet. In an existing project reuse its own libraries; in adapt or no-framework mode use `references/vanilla.md`.

`motion`, `lenis` and the three.js packages are not in the user's list. They are the minimum add-ons needed for "smooth" and "3D". Add them only when the design plan calls for them.

## Workflow

Follow these stages in order. Do not skip the plan.

### 1. Understand
Identify the subject, audience and the page's primary job. If the brief is silent, propose one concrete reading in a sentence and proceed. Ask at most one question, only if the answer changes the design.

### 2. Design plan (write it before coding)
Produce a compact plan:
- **Palette:** 4 to 6 named hex values (base, surface, ink, accent, plus one highlight). Chosen for this subject.
- **Type:** one or two families with clear roles. Body line length under 80 characters.
- **Depth model:** which layers exist (background, glass surface, floating element) and how light falls (one light direction for the whole page).
- **Signature moment:** the single memorable element, and its fallback.
- **Layout:** a one-line concept and an ASCII wireframe.
- **Motion budget:** list every animation and which user action triggers it.
Then review the plan: if any part is what you would produce for any similar page, change it and say what you changed.

### 3. Stack and scaffold
**An existing, running project always wins.** Adapt the skill to it. Never install, replace or migrate a framework, UI kit, CSS framework, icon set, form/data/toast library, linter or test runner on your own, even if it differs from the table below. Reuse what the project already has and follow its conventions. The only exception is a real need the project cannot meet (for example the design requires a library it lacks): then name the exact packages and why, ask the user once, and install only after they approve.

Detect the stack before touching anything:
- `package.json` with `next`, or `react` (+ `vite`): **React mode**. Use the table below only for jobs the project does not already cover; keep its existing UI kit, toasts, forms and data layer.
- `package.json` with Vue, Svelte, Angular, Astro, Solid, Preact, Lit or no UI framework: **adapt mode**. Keep the framework. Use the principles, tokens, glass and motion rules in plain CSS (`references/vanilla.md`); the React-only libraries do not apply.
- No `package.json`, but an `index.html`: **no-framework mode**. Read `references/vanilla.md`. Do not add a build step or npm packages the user did not ask for.
- Empty folder (nothing but VCS, `AGENTS.md`, `.claude/`, `.agents/`): there is no project yet. **Ask the user once** which they want: Next.js (recommended), Vite + React, or plain HTML/CSS/JS with no framework. Never pick for them.

Run setup from the project root (the script lives in this skill's folder, for example `.claude/skills/glass-motion-frontend/scripts/setup.mjs` or `.agents/skills/...`):

```bash
node <skill-folder>/scripts/setup.mjs --stack next      # empty folder only. or: vite | vanilla
node <skill-folder>/scripts/setup.mjs                   # existing project: lists optional packages, installs nothing
node <skill-folder>/scripts/setup.mjs --approve         # only after the user approved that list
```

In an existing project setup installs nothing by itself: without `--approve` it exits with code 3 and `NEEDS_APPROVAL` plus the package list. Ask the user; if they decline, carry on with the libraries the project has. Packages already present, and tools that duplicate ones the project uses (ESLint/Prettier vs Biome, Jest vs Vitest, Cypress vs Playwright), are never added. Setup never overwrites an existing file: new projects are generated in a temp folder and only missing files are copied in. Without `--stack` in an empty folder in a non-interactive shell it exits with code 2 and `NEEDS_STACK`: ask the user, then run again with `--stack`. For new React projects confirm Tailwind v4, `components.json` and Biome are present before adding components (`references/library-map.md` has the manual route).

### 4. Compose
Build in this order so the base stays consistent:
1. Tokens and the `glass` surface utilities (`references/recipes.md`).
2. coss ui primitives for all interactive controls.
3. Layout and content with real copy, not lorem ipsum.
4. Magic UI effects, only the ones in the motion budget.
5. Tremor for data sections.
6. Lucide icons (`size-4` or `size-5`, one stroke width everywhere), unDraw for empty and error states.

### 5. Behavior
- Forms: React Hook Form + zod, field-level errors with a message that says how to fix it, submit through `toast.promise`.
- Data: TanStack Query with explicit loading, empty and error states. Skeletons match the final layout.
- Lists and tables: TanStack Table; virtualize past roughly 100 rows.
- URL state: nuqs for filters, sort, page, tab.
- Copy: active voice, sentence case, the button says what happens ("Save changes"), and the toast repeats the same verb ("Changes saved").

### 6. Feel (polish pass)
Apply the numbers in "Feel rules". Add the signature moment last, behind a lazy boundary, with a static fallback.

### 7. Verify
Run the gates in `references/quality-gates.md`. At minimum: `biome check`, `vitest run`, `playwright test` (screenshots at 390, 834, 1440 plus reduced motion), and a React Scan pass on the main interactions. Look at the screenshots. Fix, then re-run.

### 8. Report
Return: what was built, the design plan in four lines, which gates passed, what was left out and why. No marketing language.

## Feel rules

**Glossy**
- A glass surface has four parts: translucent fill, `backdrop-filter` blur with saturation, a 1px light border, and an inner top highlight. Add a faint specular sweep on hover for hero elements only.
- One light direction (top-left) for every highlight and shadow on the page.
- Layer shadows: a tight contact shadow plus a wide soft one. Never a single grey shadow on every card.
- Use at most two blur levels (for example 12px and 24px). More blur is a performance cost, not polish.
- Blur needs something behind it. Place soft color fields or a gradient mesh under glass, or it will look flat.

**Smooth**
- Micro-interactions (hover, press, focus): 120 to 200ms, ease-out. Press scales to 0.97.
- Entrances: 400 to 700ms, spring (`stiffness 200-260`, `damping 22-28`) or `cubic-bezier(0.22, 1, 0.36, 1)`.
- Stagger children 40 to 80ms; cap total stagger at 600ms.
- Animate only `transform` and `opacity`. Never animate `width`, `height`, `top`, `left` or `filter: blur()` on large areas.
- Use `layout` and shared `layoutId` from motion for reorder, expand and tab-indicator transitions.
- Smooth scroll with lenis, disabled when reduced motion is on.

**3D**
- 3D is allowed in three forms: CSS perspective tilt on cards, a single R3F canvas in the hero, or parallax layers with `translateZ`. Choose the lightest that achieves the design.
- One `<Canvas>` per page. Lazy-load with `next/dynamic` (`ssr: false`) inside a client component. Render a static poster image first.
- Budget: under 150k triangles, `dpr={[1, 1.75]}`, `frameloop="demand"` when the scene is static, pause when off-screen.
- Fallback to the poster when `prefers-reduced-motion`, `saveData`, or a low-power device is detected.
- Self-host environment maps for production; drei's `Environment preset` fetches from a CDN.

## Library rules (short)

- **coss ui:** install through the shadcn CLI from its registry. Components live in `components/ui`. Restyle through tokens, not by editing every file.
- **Magic UI:** install one component at a time. Each must appear in the motion budget. Wrap with `useReducedMotion` if the component loops.
- **Tremor:** keep chart colors from the palette tokens; set explicit height; label axes with units.
- **Lucide:** import named icons only (`import { Sparkles } from "lucide-react"`); never `import *`.
- **unDraw:** download SVG with the brand accent color; inline it or use `next/image`; add `alt=""` if decorative.
- **React Hook Form:** uncontrolled by default; use `Controller` only for custom components. Never store form values in `useState`.
- **TanStack:** one `QueryClient` in a client provider; stable query keys; `staleTime` set deliberately.
- **Sonner:** one `<Toaster />` in the root layout; position bottom-right on desktop, top-center on mobile.
- **nuqs:** wrap with the adapter for the framework (`NuqsAdapter`); define parsers once in a shared file.
- **Biome:** `biome check --write` before every report. Do not add ESLint.
- **Vitest:** test behavior (role, text), not implementation. Mock the network at the boundary.
- **Playwright:** use role locators; screenshots with `animations: "disabled"`.
- **React Scan:** dev only, never shipped to production. Fix components that re-render without visible change.

## Anti-patterns

- A glass card on a flat white background (no blur target).
- Parallax and tilt on every card.
- Auto-playing 3D with no fallback and no pause.
- Two toast systems, two icon sets, two form libraries.
- Gradient text and glow on every heading.
- Components copied from memory with invented props.
- Reporting "done" without having run the gates.

## References

- `references/vanilla.md`: no-framework mode (plain HTML, CSS, JS): what replaces each library, glass and motion in plain CSS, checks.
- `references/library-map.md`: install commands, imports, pitfalls per library.
- `references/recipes.md`: glass tokens, tilt card, R3F hero with fallback, smooth scroll, RHF + Sonner, nuqs + TanStack Table.
- `references/quality-gates.md`: commands, Playwright and Vitest templates, performance budget, final checklist.
