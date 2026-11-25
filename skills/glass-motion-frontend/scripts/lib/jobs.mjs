// "One job, one library", as data. Each job lists
//   skill: the package(s) the kit would add for that job (all of them are in presets.json)
//   core:  which of those mean "the project really uses the kit's library for this job"
//   other: packages a project may already use for the same job. If any of these is present the
//          job is COVERED: the kit never offers its own library for it, the project's is reused.
// An entry ending in "/" is a scope or prefix (for example "@mui/").
const job = (id, label, skill, other, core = skill) => ({ id, label, skill, core, other });

export const JOBS = [
  job("ui-kit", "UI components", [], [
    "@mui/", "@chakra-ui/", "@mantine/", "antd", "@heroui/", "@nextui-org/", "react-bootstrap", "@fluentui/",
    "primereact", "@headlessui/", "@radix-ui/", "@base-ui/", "@base-ui-components/", "@ariakit/", "@ark-ui/",
    "vuetify", "primevue", "element-plus", "quasar", "@nuxt/ui", "bits-ui", "@skeletonlabs/", "@angular/material",
    "primeng", "ng-zorro-antd", "daisyui", "flowbite",
  ]),
  job("charts", "charts", [], [
    "recharts", "chart.js", "react-chartjs-2", "vue-chartjs", "ng2-charts", "echarts", "echarts-for-react",
    "victory", "@nivo/", "apexcharts", "react-apexcharts", "highcharts", "@visx/", "@tremor/react", "chartist",
  ]),
  job("icons", "icons", ["lucide-react"], [
    "react-icons", "@heroicons/", "@mui/icons-material", "@tabler/icons-react", "@phosphor-icons/", "phosphor-react",
    "@fortawesome/", "@radix-ui/react-icons", "@ant-design/icons", "@chakra-ui/icons", "@iconify/", "unplugin-icons",
    "lucide-vue-next", "lucide-svelte", "lucide-angular", "@lucide/", "bootstrap-icons", "@remixicon/react",
    "iconoir-react", "@mdi/",
  ]),
  job("toasts", "toasts", ["sonner"], [
    "react-toastify", "react-hot-toast", "notistack", "@radix-ui/react-toast", "vue-toastification", "vue-sonner",
    "svelte-sonner", "svelte-french-toast", "ngx-toastr", "izitoast", "notyf", "toastify-js", "react-simple-toasts",
  ]),
  job("forms", "forms", ["react-hook-form", "@hookform/resolvers"], [
    "formik", "@tanstack/react-form", "react-final-form", "final-form", "@conform-to/react", "@mantine/form",
    "vee-validate", "@vee-validate/", "@formkit/vue", "formsnap", "sveltekit-superforms",
  ], ["react-hook-form"]),
  job("validation", "schema validation", ["zod"], [
    "yup", "valibot", "joi", "arktype", "superstruct", "@sinclair/typebox", "vest",
  ]),
  job("server-state", "server state", ["@tanstack/react-query"], [
    "swr", "react-query", "@apollo/client", "urql", "@urql/", "react-relay", "relay-runtime", "@reduxjs/toolkit",
    "@tanstack/vue-query", "@tanstack/svelte-query", "@tanstack/angular-query-experimental",
  ]),
  job("tables", "tables", ["@tanstack/react-table"], [
    "react-table", "ag-grid-react", "ag-grid-community", "@mui/x-data-grid", "material-react-table",
    "mantine-react-table", "@tanstack/vue-table", "@tanstack/svelte-table", "@tanstack/angular-table",
  ]),
  job("virtual-lists", "long-list virtualization", ["@tanstack/react-virtual"], [
    "react-window", "react-virtuoso", "react-virtualized", "react-virtual", "virtua", "@tanstack/vue-virtual",
    "@tanstack/svelte-virtual", "vue-virtual-scroller",
  ]),
  job("url-state", "URL state", ["nuqs"], ["next-usequerystate", "use-query-params"]),
  job("motion", "animation", ["motion"], [
    "framer-motion", "react-spring", "@react-spring/", "gsap", "@gsap/", "@formkit/auto-animate", "animejs",
    "@vueuse/motion", "motion-v", "@motionone/", "svelte-motion", "@angular/animations",
  ]),
  job("smooth-scroll", "smooth scroll", ["lenis"], [
    "@studio-freight/lenis", "@studio-freight/react-lenis", "locomotive-scroll", "smooth-scrollbar",
  ]),
  job("3d", "3D", ["three", "@react-three/fiber", "@react-three/drei", "@types/three"], [
    "@babylonjs/", "babylonjs", "playcanvas", "ogl", "@splinetool/", "aframe", "@threlte/", "troisjs",
  ], ["three"]),
  job("lint-format", "lint and format", ["@biomejs/biome"], [
    "eslint", "prettier", "oxlint", "dprint", "xo", "standard", "neostandard", "@antfu/eslint-config", "@eslint/js",
  ]),
  job("unit-tests", "unit tests", [
    "vitest", "@vitejs/plugin-react", "jsdom", "@testing-library/react", "@testing-library/jest-dom",
    "@testing-library/user-event",
  ], ["jest", "@jest/core", "mocha", "ava", "uvu", "@web/test-runner", "karma", "ts-jest", "babel-jest"], ["vitest"]),
  job("e2e-a11y", "end-to-end and a11y tests", ["@playwright/test", "@axe-core/playwright"], [
    "cypress", "@wdio/cli", "testcafe", "nightwatch", "cypress-axe",
  ], ["@playwright/test"]),
  job("render-perf", "render profiling", ["react-scan"], [
    "@welldone-software/why-did-you-render", "why-did-you-render", "react-render-tracker",
  ]),
];

const matches = (name, entry) => (entry.endsWith("/") ? name.startsWith(entry) : name === entry);
const present = (deps, list) => Object.keys(deps).filter((name) => list.some((entry) => matches(name, entry)));

// Which job a package belongs to (for listing "lucide-react: icons").
export function jobOf(pkg) {
  return JOBS.find((j) => j.skill.includes(pkg));
}

// For every job: is it covered by a library the project already has?
//   byOther: packages the project uses for the job that are NOT the kit's (these block the kit's own)
//   byKit:   the kit's core library, when the project already has it
export function coverage(deps) {
  return JOBS.map((j) => {
    const byOther = present(deps, j.other);
    const byKit = j.core.filter((name) => name in deps);
    return { id: j.id, label: j.label, skill: j.skill, byOther, byKit, covered: byOther.length > 0 || byKit.length > 0 };
  });
}
