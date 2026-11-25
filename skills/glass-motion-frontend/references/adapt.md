# Adapting to a running project

Read this whenever `setup.mjs --detect` says the project already exists (anything except an empty folder). The goal: the new work looks like the project grew it itself, and nothing is installed, replaced or migrated that the user did not approve.

## 1. Read the profile

```bash
node <skill-folder>/scripts/setup.mjs --detect          # readable
node <skill-folder>/scripts/setup.mjs --detect --json   # for parsing
```

| Field | What to do with it |
|---|---|
| `kind` | Picks the route (table in SKILL.md, stage 3). `other` means unrecognised files: treat as existing, do not scaffold. |
| `styling` | Which styling system hosts the tokens (section 3). `globalStyles` are the files new tokens go into. |
| `jobs` | `covered: true` means the project already has a library for that job: reuse it, never add the kit's. `byOther` is the library to use. |
| `checks` | The project's own scripts. Run those in stage 7, with its package manager. |
| `git` | `changes > 0`: tell the user before editing, so your diff stays separable from theirs. |
| `members` | Monorepo packages. Pick one with the user and run detect again with `--dir <package>`. |

## 2. Map each job to what the project has

The table in SKILL.md is the default for new projects. In a running project the job is done by what it already uses.

| Job | Default (new project) | In a running project |
|---|---|---|
| Controls, dialogs, menus | coss ui | The project's UI kit (MUI, Chakra, Mantine, Ant Design, Radix or shadcn-style components, Headless UI, Vuetify, Angular Material, ...) or native elements. Theme it through its own theming mechanism. |
| Signature effects | Magic UI | The project's animation library, or CSS (`references/vanilla.md`). A Magic UI component is copy-in source that may pull in packages and a Tailwind setup: check first, and treat any package it adds as an install. |
| Charts | Tremor | The chart library the project already has, with colors from the palette tokens. |
| Icons | Lucide | The project's icon set, one size and stroke everywhere. |
| Toasts | Sonner | The project's toast system. One toast system only. |
| Forms, validation | React Hook Form + zod | The project's form and validation approach (Formik, vee-validate, Angular forms, plain native validation). |
| Server data | TanStack Query | The project's data layer (SWR, Apollo, RTK Query, framework loaders, plain fetch helpers). |
| Tables, long lists | TanStack Table, Virtual | The project's grid or list component, or a native `<table>`. |
| Spring and gesture motion | motion | The project's animation library. `framer-motion` is the same API as `motion/react`: write `import { motion } from "framer-motion"` and keep the recipe as is. Otherwise CSS transitions and the Web Animations API. |
| Smooth scroll | lenis | CSS `scroll-behavior` under `prefers-reduced-motion: no-preference`, or the project's own scroll library. |
| 3D | three + R3F | CSS `perspective` tilt or layered parallax. WebGL only with approval (section 4). |
| Lint, tests | Biome, Vitest, Playwright | The project's own. Never add a second linter, test runner or e2e tool. |

`recipes.md` imports from `motion/react` and `@/components/ui/...` and uses Tailwind v4 classes. Translate each recipe to the project's own imports, components and styling instead of installing what the recipe assumes.

## 3. Where tokens and the glass surface go

New styles go into a file the project already has (see `styling.globalStyles`), as appended tokens. Do not create a parallel design system. Where the project already has tokens (`--background`, `--primary`, a theme object), alias the kit's names to them instead of defining new colors:

```css
:root {
  --surface: var(--card);       /* alias to the project's own token */
  --highlight: #ffffff;
  --light-angle: 145deg;        /* one light direction for the whole page */
}
```

**Tailwind v4:** `references/recipes.md` section 1, as written.

**Tailwind v3:** keep v3, do not upgrade. Put the rule in the global stylesheet:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .glass {
    background: linear-gradient(var(--light-angle),
      color-mix(in oklab, var(--surface) 72%, transparent),
      color-mix(in oklab, var(--surface) 38%, transparent));
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid color-mix(in oklab, var(--highlight) 18%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--highlight) 50%, transparent),
      0 18px 40px -12px rgb(0 0 0 / 0.35);
  }
}
```

**Plain CSS, CSS Modules, SCSS, Less:** the `.glass` rule in `scripts/templates/vanilla/css/styles.css`, in a shared file or partial that is imported once. With CSS Modules use `composes` or the same rule in the module.

**styled-components, Emotion:** one shared helper built from the same custom properties:

```tsx
import { css } from "styled-components"; // Emotion: import { css } from "@emotion/react"

export const glass = css`
  background: linear-gradient(var(--light-angle),
    color-mix(in oklab, var(--surface) 72%, transparent),
    color-mix(in oklab, var(--surface) 38%, transparent));
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid color-mix(in oklab, var(--highlight) 18%, transparent);
`;
```

**MUI, Chakra, Mantine, Ant Design:** define the custom properties in the global stylesheet and apply them through the component's own style prop. Do not fork or replace the theme.

```tsx
<Paper elevation={0} sx={{
  borderRadius: 3, p: 3,
  background: "var(--glass-fill)",
  backdropFilter: "blur(18px) saturate(160%)",
  border: "1px solid var(--glass-border)",
}} />
```

**Vue, Svelte, Angular, Astro, Solid, Lit:** keep the framework. Tokens go in the global stylesheet the app already loads (`src/assets/main.css`, `app.css`, `src/styles.css`, `src/styles/global.css`); component-level rules go in the component's own style block. Same CSS as above. Motion comes from CSS and the Web Animations API unless the project already has an animation library.

**Server-rendered projects (Laravel Blade, Django, Rails, WordPress, Hugo, Jekyll, .NET, Phoenix, ...):** no npm, no framework added. Put the CSS where the project keeps its stylesheets and load it with the project's own asset helper:

| Stack | Load the stylesheet with |
|---|---|
| Laravel | `{{ asset('css/glass.css') }}`, or append to the CSS entry already listed in `@vite([...])` |
| Django | `{% load static %}` then `{% static 'css/glass.css' %}` |
| Rails | `stylesheet_link_tag "glass"` |
| WordPress | `wp_enqueue_style('glass', get_theme_file_uri('css/glass.css'), [], null)` |
| Hugo | `resources.Get "css/glass.css"` then `.RelPermalink` |
| Jekyll | `{{ '/assets/css/glass.css' \| relative_url }}` |

Interactivity stays with what the project already uses (Livewire, Alpine, htmx, Hotwire, Stimulus): add motion with CSS and a small classic script, gated on `prefers-reduced-motion`.

## 4. Approval protocol

Nothing is added to a running project on the agent's own judgment. First try without it: every "feel" item has a CSS-only version in `references/vanilla.md`, and the project's own libraries do most jobs. Only a real need that remains goes to the user, as one question that names each package:

> This project already runs on {stack} with {UI kit / styling}. I'll reuse what it has.
> For {specific need} its own tools fall short. I would need {package} ({job}). Without it: {the CSS-only alternative and what the design gives up}.
> Install {package}? (yes / no, use the alternative)

Indonesian: *Proyek ini sudah berjalan dengan {stack}. Saya akan memakai yang sudah ada. Untuk {kebutuhan} alat bawaannya kurang: saya perlu {paket} ({fungsi}). Tanpa itu: {alternatif dan apa yang dikorbankan}. Pasang {paket}? (ya / tidak, pakai alternatif)*

Wait for the answer. Install only what was approved:

```bash
node <skill-folder>/scripts/setup.mjs --only zod,lenis --approve
```

`--approve` is the user's yes. Never pass it unless they said yes in this conversation. If they decline, continue with what exists and say in the report what the design gave up.

**Needs approval:** any package; `shadcn init` and `shadcn add` or any registry command that writes config, CSS or packages; changing the version of React, Next, Tailwind or any framework; new tool config files (`biome.json`, test or e2e config); adding a bundler, TypeScript or a build step; a CDN `<script>` or web-font link; any command that changes the lockfile; a Playwright browser download.

**Does not need approval:** editing and adding source files for the task, appending tokens to the project's stylesheet, using packages that are already installed.

A framework added to a folder that already has a project is a migration, not an adaptation. `setup.mjs --stack next|vite` refuses it (exit 4, `NEEDS_CONFIRMATION`) unless the user explicitly approves.

## 5. Baseline, verify, report

1. Before editing, run the project's own checks (the scripts under `checks`) once and note what already fails. Those failures are not yours and are not fixed unless asked.
2. After editing, run the same checks. You must not add failures.
3. Format and autofix only the files you touched (`eslint --fix <files>`, `prettier --write <files>`, `biome check --write <files>`). A project-wide formatter produces a diff nobody asked for.
4. Look at the result in the project's own dev server (its `dev` script), at 390, 834 and 1440 px, plus reduced motion.
5. A check the project does not have is reported as "not run: no {tool} in the project". It is not installed to satisfy a gate.

## 6. Monorepos

`--detect` at the root lists the packages. Pick the one you are changing with the user and run detect and setup there with `--dir <package>`; the package manager is taken from the root lockfile. Never install at the root. Shared tokens belong in a shared UI package only when the user wants the change site-wide: ask first.

## 7. Things that bite in running projects

- **SSR and hydration:** canvas, WebGL and anything that reads `window` runs client-side only, in the way the framework already does it (`dynamic` with `ssr: false`, `client:only`, `onMount`, `afterNextRender`).
- **No new network dependencies:** do not add CDN scripts, web fonts or remote images to a project with a content security policy, an offline requirement or a privacy stance. Self-host.
- **i18n:** put new copy through the project's translation setup; do not hard-code strings next to translated ones.
- **Existing accessibility:** keep the roles, labels and landmarks the markup already has.
- **Browser support:** check `browserslist` (or the project's stated support). `backdrop-filter` and `color-mix` need the `@supports` fallback from the recipes.
- **Brand and design system:** extend them, do not override. A restyle asked for on one page stays on that page unless the user says site-wide.
- **Language:** follow the project's conventions for identifiers, comments and UI copy, even where they differ from English defaults.
