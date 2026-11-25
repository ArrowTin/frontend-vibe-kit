# Quality gates

Run in this order. Do not report "done" until every gate passes or the failure is explained.

**Which gates apply.** New project: all six, with the commands below. Existing project: the project's own checks only, taken from `setup.mjs --detect` (`checks`) and run with its package manager (the commands below use pnpm as an example). Run them once before editing to get a baseline, and again after: you must not add failures, and you do not fix unrelated ones. A gate the project has no tool for is reported as "not run: no {tool} in the project"; it is not installed to make the gate pass. Format and autofix only the files you touched.

| # | Gate | Command | Pass condition |
|---|---|---|---|
| 1 | Lint + format | `pnpm biome check --write .` then `pnpm biome check .` | zero errors |
| 2 | Types | `pnpm tsc --noEmit` | zero errors |
| 3 | Unit/component | `pnpm vitest run` | all green |
| 4 | E2E + visual + a11y | `pnpm exec playwright test` | all green, screenshots reviewed |
| 5 | Render performance | React Scan in dev, exercise main flows | no component flashing without visible change |
| 6 | Production build | `pnpm build` | succeeds, no new warnings |

## Performance budget

- LCP under 2.5s on a throttled mid-range mobile profile.
- CLS under 0.05. Reserve space for images, the 3D canvas and fonts.
- INP under 200ms.
- Initial JS for the first route under 200 KB gzipped, excluding the lazy 3D chunk.
- 3D chunk loads after first paint and never blocks LCP (the poster image is the LCP element).
- Animate `transform` and `opacity` only.

## Vitest template

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], globals: true },
  resolve: { alias: { "@": new URL("./", import.meta.url).pathname } },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

```tsx
// components/subscribe-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SubscribeForm } from "./subscribe-form";

it("shows a fix-it message for an invalid email", async () => {
  render(<SubscribeForm save={vi.fn()} />);
  await userEvent.type(screen.getByRole("textbox"), "nope");
  await userEvent.click(screen.getByRole("button", { name: /subscribe/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/name@example\.com/);
});
```

## Playwright template

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: { command: "pnpm build && pnpm start", url: "http://localhost:3000", reuseExistingServer: true },
  use: { baseURL: "http://localhost:3000" },
});
```

```ts
// e2e/home.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of viewports) {
  test(`home renders cleanly on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot(`home-${vp.name}.png`, { fullPage: true, animations: "disabled" });
  });
}

test("no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("reduced motion shows the static hero", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  await context.close();
});

test("keyboard focus is visible on the primary action", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus-visible");
  await expect(focused).toBeVisible();
});
```

Open the generated screenshots and look at them: check spacing, contrast on glass, clipped shadows, and that the glass has something behind it to blur.

## React Scan routine

1. Start the dev server with React Scan enabled.
2. Perform: scroll the page, hover cards, open a dialog, type in a form, change a filter.
3. Anything that flashes repeatedly without a visible change is a bug: memoize the value, move state down, or split the component.
4. Remove React Scan from the production bundle (dev-only import).

## Final checklist

- [ ] Design plan written and reviewed against the brief
- [ ] One signature moment, with a static fallback
- [ ] Every animation is in the motion budget and tied to a trigger
- [ ] Reduced motion tested
- [ ] Keyboard path works; focus ring visible on every control
- [ ] Contrast AA over glass at its lightest and darkest background
- [ ] Loading, empty and error states exist for every data view
- [ ] Filters, tabs and pagination survive refresh (nuqs)
- [ ] One toast system, one icon set, one form library
- [ ] Biome, tsc, Vitest, Playwright, build all pass
- [ ] Report lists what was left out and why
