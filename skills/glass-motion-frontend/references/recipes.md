# Recipes

Starting points. Replace palette and sizes with values from the design plan.

## 1. Tokens and glass surface (Tailwind v4)

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  --base: #0e1424;        /* replace per project */
  --surface: #1a2238;
  --ink: #eef2ff;
  --accent: #5eead4;
  --highlight: #ffffff;
  --light-angle: 145deg;  /* one light direction for the whole page */
}

@utility glass {
  background: linear-gradient(
    var(--light-angle),
    color-mix(in oklab, var(--surface) 72%, transparent),
    color-mix(in oklab, var(--surface) 38%, transparent)
  );
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid color-mix(in oklab, var(--highlight) 18%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--highlight) 50%, transparent),
    inset 0 -1px 0 color-mix(in oklab, black 10%, transparent),
    0 1px 2px rgb(0 0 0 / 0.08),
    0 18px 40px -12px rgb(0 0 0 / 0.35);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); }
}

/* Specular sweep for hero elements only */
@utility gloss {
  position: relative;
  overflow: hidden;
}
@utility gloss-sweep {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.22) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}
.gloss:hover .gloss-sweep { transform: translateX(120%); }

@media (prefers-reduced-motion: reduce) {
  .gloss-sweep { transition: none; }
}
```

Give the glass something to blur: a soft color field behind the section.

```tsx
<div className="relative isolate overflow-hidden bg-[var(--base)]">
  <div aria-hidden className="absolute -top-32 left-1/4 size-[32rem] rounded-full bg-[var(--accent)]/25 blur-3xl" />
  <div className="glass relative rounded-2xl p-6">…</div>
</div>
```

## 2. Tilt card with glare (motion)

```tsx
"use client";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import type { PointerEvent, ReactNode } from "react";

export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), spring);
  const gx = useTransform(px, [0, 1], [0, 100]);
  const gy = useTransform(py, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.22), transparent 60%)`;

  if (reduce) return <div className={className}>{children}</div>;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileTap={{ scale: 0.98 }}
        className={`relative ${className ?? ""}`}
      >
        {children}
        <motion.div
          aria-hidden
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      </motion.div>
    </div>
  );
}
```

Use on at most one group of cards per page, and never on text-heavy cards.

## 3. R3F hero with poster, lazy load and fallbacks

```tsx
// components/hero-scene.tsx
"use client";
import { Environment, Float, MeshTransmissionMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function Gem() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.2, 1]} />
        <MeshTransmissionMaterial
          thickness={0.6}
          roughness={0.05}
          transmission={1}
          ior={1.25}
          chromaticAberration={0.04}
          samples={4}
          resolution={512}
        />
      </mesh>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} />
      <Gem />
      <Environment preset="city" /> {/* self-host an .hdr for production */}
    </Canvas>
  );
}
```

```tsx
// components/hero-gate.tsx
"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

function canRun3D() {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  const lowPower = (navigator.hardwareConcurrency ?? 4) <= 2 || nav.connection?.saveData === true;
  return !reduce && !lowPower;
}

export function HeroGate() {
  const [run, setRun] = useState(false);
  useEffect(() => setRun(canRun3D()), []);
  return (
    <div className="relative aspect-square w-full max-w-xl">
      <Image src="/hero-poster.webp" alt="" fill priority className="object-contain" />
      {run && (
        <div className="absolute inset-0">
          <HeroScene />
        </div>
      )}
    </div>
  );
}
```

Pause when off-screen: observe the wrapper with `IntersectionObserver` and render `<Canvas frameloop={visible ? "always" : "never"}>`. Use `frameloop="demand"` for static scenes.

## 4. Smooth scroll (lenis)

```tsx
"use client";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
```

## 5. Form: React Hook Form + zod + Sonner

```tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter an email like name@example.com"),
});
type Values = z.infer<typeof schema>;

export function SubscribeForm({ save }: { save: (v: Values) => Promise<void> }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit((values) =>
    toast.promise(save(values), {
      loading: "Subscribing…",
      success: "Subscribed",
      error: "Couldn't subscribe. Check your connection and try again.",
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Use coss ui Field / Input / Button here */}
      <input {...form.register("email")} aria-invalid={!!form.formState.errors.email} />
      {form.formState.errors.email && <p role="alert">{form.formState.errors.email.message}</p>}
      <button type="submit" disabled={form.formState.isSubmitting}>Subscribe</button>
    </form>
  );
}
```

## 6. Filters in the URL: nuqs + TanStack Query + Table

```ts
// lib/search-params.ts
import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

export const filters = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(["name", "date"] as const).withDefault("date"),
};
```

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { filters } from "@/lib/search-params";

export function ItemsTable() {
  const [{ q, page, sort }, setFilters] = useQueryStates(filters);
  const { data, isPending, isError } = useQuery({
    queryKey: ["items", { q, page, sort }],
    queryFn: () => fetch(`/api/items?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`).then((r) => r.json()),
    staleTime: 30_000,
  });
  // isPending -> skeleton rows matching final layout; isError -> message + retry; empty -> unDraw illustration
  // Render rows with TanStack Table; virtualize with TanStack Virtual past ~100 rows.
  return null;
}
```

## 7. Shared layout transition (tab indicator)

```tsx
{tabs.map((t) => (
  <button key={t.id} onClick={() => setActive(t.id)} className="relative px-4 py-2">
    {active === t.id && (
      <motion.span layoutId="tab-pill" className="glass absolute inset-0 rounded-full"
        transition={{ type: "spring", stiffness: 380, damping: 32 }} />
    )}
    <span className="relative">{t.label}</span>
  </button>
))}
```
