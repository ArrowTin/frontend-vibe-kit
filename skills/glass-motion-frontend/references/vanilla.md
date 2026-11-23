# No-framework mode (plain HTML, CSS, JS)

Use when the project has no `package.json` (an `index.html` and static files), and also as the CSS/motion guide in adapt mode (an existing Vue, Svelte, Angular, Astro or other non-React project): keep the project's framework and apply the same tokens, glass, motion and checks there. The goal and the quality floor are the same as in React mode; only the tools change. Do not add a bundler, TypeScript or npm packages unless the user asks. A page that opens straight from disk is a feature.

## What replaces each library

| Job | Plain-HTML way | Notes |
|---|---|---|
| Controls, dialogs, tabs, menus | Native elements: `<button>`, `<dialog>`, `<details>`, the `popover` attribute, `<select>` | Style with tokens; keep native keyboard behavior. |
| Glass surfaces, tokens | CSS custom properties + the `.glass` rule in `templates/vanilla/css/styles.css` | Same four parts as React mode: translucent fill, blur + saturate, 1px border, inner highlight. Needs something to blur behind it. |
| Motion | CSS transitions and `@keyframes`; Web Animations API (`element.animate`) for sequences; `IntersectionObserver` for scroll-triggered reveals | Animate `transform` and `opacity` only. Gate non-user-triggered motion on `prefers-reduced-motion`. |
| Spring, gesture, layout animation | Only if the user accepts a dependency: the `motion` package (vanilla `animate`) | Ask first. If a CDN script is unavoidable, pin an exact version and tell the user. |
| Smooth scroll | `scroll-behavior: smooth` inside `@media (prefers-reduced-motion: no-preference)` | No scroll hijacking. |
| 3D | CSS `perspective` + `transform` tilt, or layered parallax with `translateZ` | A WebGL canvas only if the user asks; then one canvas, lazy-started, with a static fallback. |
| Icons | Inline SVG copied from Lucide (lucide.dev), one stroke width everywhere | Icon-only buttons need `aria-label`. |
| Illustrations | Inline unDraw SVG recolored to the brand accent | Empty and error states, not the hero. |
| Forms | Native validation (`required`, `type`, `pattern`) + the Constraint Validation API; show messages in an element with `aria-live="polite"` | Message says how to fix the problem. |
| Toasts | One `<output role="status">` region that scripts write into | One system only. |
| Tables | Native `<table>` with `<caption>` and `<th scope>`; sort with a small script | Past ~100 rows, paginate or ask about adding TanStack. |
| Charts | Inline SVG or `<canvas>`; label axes with units | Ask before adding a chart library. |
| State in the URL | `URLSearchParams` + `history.replaceState` | Filters, sort, tab, page. |

## Files

```
index.html
css/styles.css      tokens, glass, focus, reduced motion
js/main.js          classic script (no modules), so file:// works
```

Add pages as more `.html` files that share `css/styles.css`. Keep one light direction and the same tokens on every page.

## Checks (nothing to install in the project)

- Serve and look: `npx serve .` (or `python3 -m http.server`), then open the page at 390, 834 and 1440 px.
- Screenshots (optional): `npx playwright install chromium`, then `npx playwright screenshot --viewport-size=390,844 http://localhost:3000 shot-390.png` (use the port the server prints).
- Lint and format (optional): `npx @biomejs/biome check .`. Run it only if the user is fine with a one-off tool; do not add a config file unasked.
- Manual floor: Tab through the page and see a focus ring on every control; toggle reduced motion in the OS or browser and confirm nothing loops; check contrast; no horizontal scroll at 360 px.

## Report

Same as React mode: what was built, the design plan in four lines, which checks were done, what was left out and why.
