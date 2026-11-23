# Library map

Install commands assume pnpm. Swap for npm/bun/yarn as needed. Component names and registry namespaces for copy-in libraries change over time: always confirm on the library's docs page before installing.

## Base project

```bash
pnpm create next-app@latest my-app --ts --tailwind --app
cd my-app
pnpm add -D -E @biomejs/biome && pnpm biome init
pnpm dlx shadcn@latest init @coss/style      # coss ui as the base style (Base UI + Tailwind v4)
```

Requirements: React 19, Tailwind CSS 4, Base UI 1.x (`@base-ui/react`).

## coss ui (https://coss.com/ui)
- What: accessible, composable components on Base UI, distributed as source through a shadcn registry.
- Add components with the shadcn CLI from the coss registry; read the component's docs page for the exact command.
- Pitfall: do not mix Radix-based shadcn components and Base UI (coss) components in one project. Pick Base UI.
- Pitfall: coss has its own toast. Use Sonner instead so there is only one toast system.

## Magic UI (https://magicui.design)
- What: animated React + Tailwind + motion components (bento grid, marquee, border beam, shiny button, dock, globe, animated beam, number ticker, blur fade).
- Install per component from the docs page (shadcn registry command). Needs `motion` (installed automatically by most components).
- Pitfall: looping components (marquee, beam) must pause or stop under `prefers-reduced-motion`.
- Pitfall: more than three Magic UI effects on one screen reads as noise. Stay inside the motion budget.

## Tremor (https://www.tremor.so)
- What: dashboard blocks, KPI cards, charts (built on Recharts).
- Follow the docs for the current install method. Copy only the blocks you use.
- Pitfall: charts need an explicit height on the container. Map series colors to palette tokens.

## Lucide (https://lucide.dev)
```bash
pnpm add lucide-react
```
```tsx
import { Sparkles } from "lucide-react";
<Sparkles className="size-4" aria-hidden />
```
- Pitfall: icon-only buttons need an accessible name (`aria-label`).

## unDraw (https://undraw.co)
- Set the accent color on the site, download the SVG, place it in `public/illustrations/` or inline it.
- Use for empty, error and onboarding states. Not for the hero.

## React Hook Form (https://react-hook-form.com)
```bash
pnpm add react-hook-form zod @hookform/resolvers
```
- Pitfall: keep `defaultValues` complete to avoid uncontrolled-to-controlled warnings.
- Pitfall: with zod 4, use a current `@hookform/resolvers`.

## TanStack (https://tanstack.com)
```bash
pnpm add @tanstack/react-query @tanstack/react-table @tanstack/react-virtual
```
- Add `@tanstack/react-query-devtools` as a dev dependency if useful.
- Router/Start are optional. In Next.js, skip TanStack Router.
- Pitfall: create the `QueryClient` inside a client component with `useState`, not at module level in a server file.

## Sonner (https://sonner.emilkowal.ski)
```bash
pnpm add sonner
```
```tsx
// app/layout.tsx
import { Toaster } from "sonner";
<Toaster position="bottom-right" richColors closeButton />
```

## nuqs (https://github.com/47ng/nuqs)
```bash
pnpm add nuqs
```
```tsx
// app/layout.tsx (Next.js App Router)
import { NuqsAdapter } from "nuqs/adapters/next/app";
<NuqsAdapter>{children}</NuqsAdapter>
```
- Define parsers once (`lib/search-params.ts`) and reuse them in client and server code.
- Pitfall: for debounced URL updates, check the current nuqs docs for the supported option name before using it.

## Vitest (https://vitest.dev)
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## Playwright (https://playwright.dev)
```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install --with-deps chromium
```

## React Scan (https://react-scan.com)
```bash
pnpm add -D react-scan
```
- Enable in development only. Follow the framework-specific snippet on its docs page.
- Pitfall: never ship it to production.

## Biome (https://biomejs.dev)
```bash
pnpm add -D -E @biomejs/biome
pnpm biome init
pnpm biome check --write .
```
- Pitfall: do not keep ESLint and Prettier alongside it.

## Add-ons for "smooth" and "3D" (not in the original list)
```bash
pnpm add motion lenis three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```
- `@react-three/fiber` v9 pairs with React 19.
- Import motion from `motion/react`.
- Import lenis React bindings from `lenis/react`.

## Suggested `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "check": "biome check .",
    "fix": "biome check --write .",
    "test": "vitest run",
    "e2e": "playwright test",
    "verify": "pnpm check && pnpm test && pnpm e2e"
  }
}
```
