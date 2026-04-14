# AvidiaTech Design System

> Last updated: April 2026

This document captures the visual design language used across the AvidiaTech SaaS application — including module color assignments, PageShell patterns, component conventions, and ambient background rules. Use this as the source of truth when adding new pages or components.

---

## Technology stack

- **Framework**: Next.js 16, App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 3.4.14, `darkMode: "class"`
- **Auth**: Clerk
- **Database**: Supabase (Postgres)

---

## Color system — module registry

Each module has one dedicated accent color. The sidebar dot, active item highlight, and page background wash **all use the same color**. Cross-module color sharing is allowed only across different sidebar sections.

| Module         | Glow preset | Tailwind family  | Sidebar section               |
|----------------|-------------|------------------|-------------------------------|
| Extract        | `amber`     | amber/orange     | AI Extraction & Content       |
| Describe       | `violet`    | violet/purple    | AI Extraction & Content       |
| SEO            | `emerald`   | emerald/teal     | AI Extraction & Content       |
| Translate      | `sky`       | sky/blue         | AI Extraction & Content       |
| Cluster        | `indigo`    | indigo/violet    | AI Extraction & Content       |
| Studio         | `fuchsia`   | fuchsia/pink     | AI Extraction & Content       |
| Match          | `cyan`      | cyan/teal        | Data Intelligence             |
| Variants       | `rose`      | rose/pink        | Data Intelligence             |
| Specs          | `teal`      | teal/cyan        | Data Intelligence             |
| Docs           | `orange`    | orange/amber     | Data Intelligence             |
| Images         | `coral`     | rose/red         | Data Intelligence             |
| Import         | `emerald`   | emerald/teal     | Commerce & Automation         |
| Audit          | `rose`      | rose/pink        | Commerce & Automation         |
| Price          | `amber`     | amber/orange     | Commerce & Automation         |
| Feeds          | `orange`    | orange/amber     | Commerce & Automation         |
| Monitor        | `sky`       | sky/blue         | Commerce & Automation         |
| Browser        | `cyan`      | cyan/teal        | Developer Tools               |
| API / API Keys | `indigo`    | indigo/violet    | Developer Tools               |

### Workspace / utility pages (no sidebar entry)

| Page            | Glow preset | Rationale                              |
|-----------------|-------------|----------------------------------------|
| Analytics       | `sky`       | Data/reporting — neutral cool          |
| Notifications   | `amber`     | Alerts/urgency — warm amber            |
| Versioning      | `teal`      | History/tracking — calm teal           |
| Roles           | `indigo`    | Access/permissions — deep indigo       |
| Organization    | `indigo`    | Settings family — matches roles        |
| Subscription    | `indigo`    | Billing/plan — settings family         |
| Visualize       | `violet`    | Charts/viz — elegant violet            |
| Agency          | `fuchsia`   | Partner/services — fuchsia             |
| Pricing         | `cyan`      | Onboarding/conversion — clean cyan     |
| Validate        | `emerald`   | Quality gate — health green            |
| Docs (sub-page) | `violet`    | Related to Describe — same family      |

---

## PageShell

`src/components/layout/PageShell.tsx` is the single shared wrapper for every module page inside the dashboard.

### GlowPreset type

```ts
type GlowPreset =
  | "cyan" | "fuchsia" | "emerald" | "violet" | "amber"
  | "rose" | "sky" | "neutral" | "indigo" | "orange" | "teal" | "coral";
```

### What PageShell renders (in stacking order)

1. **3px top gradient stripe** — left-to-right gradient, module color → transparent
2. **washLight div** (`dark:hidden`) — full-width 70%-height top-to-transparent fade, light mode opacity
3. **washDark div** (`hidden dark:block`) — same but stronger opacity for dark mode
4. **Top-left corner blob** — blurred radial blob, module color/28–32% opacity
5. **Bottom-right corner blob** — blurred radial blob, adjacent hue/14–20% opacity
6. **Center atmospheric glow** — large soft blob at `top-[30%]`, module color/8–12% opacity
7. **Dot grid** (light mode `dark:hidden`) — radial gradient dots, slate-400/35%
8. **Dot grid** (dark mode `hidden dark:block`) — same but slate-600/25%
9. **Bottom vignette** — `bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950`
10. **`{children}`** — actual page content with `relative z-10`

### Usage

```tsx
<PageShell glow="amber">
  {/* page content */}
</PageShell>
```

Optional props: `noPad` (removes default padding), `maxW` (changes max-width).

---

## Color harmony rule

Each page's secondary blob must use an **adjacent hue from the same color-wheel segment** — no cross-family mixing:

| Primary    | Secondary blob |
|------------|---------------|
| amber      | orange        |
| violet     | indigo        |
| sky        | blue          |
| teal       | cyan          |
| emerald    | teal          |
| fuchsia    | pink          |
| rose       | pink          |
| indigo     | violet        |
| cyan       | teal / sky    |
| orange     | amber         |
| coral      | rose          |

---

## Force-dark sections

Standalone pages outside the main dashboard layout (sign-in, sign-up, legal, docs, settings) use `className="dark"` on their root `<div>` to force the dark theme regardless of the user's system preference:

```tsx
<div className="dark relative min-h-[100dvh] bg-slate-950 …">
```

Pages using this pattern:
- `/sign-in` — cyan ambient
- `/sign-up` — fuchsia/indigo ambient
- `/docs` layout — cyan/violet ambient
- `/settings` layout — indigo/violet/cyan ambient
- `/legal/privacy` — violet/indigo ambient
- `/legal/terms` — cyan/sky ambient
- `/app/status` — emerald/cyan ambient
- `/app/not-found` — indigo/violet/cyan (404 page)
- `/app/error` — rose/orange/amber (error boundary)

---

## Sidebar module color registry

`src/components/Sidebar.tsx` uses a flat `MODULE_COLORS` registry (not conditional logic) to assign each module's active/hover colors:

```ts
type AccentConfig = {
  dot: string;        // bg-X-400 (sidebar dot)
  activeText: string; // text-X-300 (active item label)
  activeBg: string;   // bg-X-500/10 (active item bg tint)
  glow: string;       // shadow-[inset_3px_0_0_rgba(...)] (left accent bar)
  hoverText: string;  // hover:text-X-200
};
```

**Rule**: The sidebar `dot` color must always match the page's `glow` preset color family.

---

## Card design

All module cards follow this pattern:

```
rounded-2xl border border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(148,163,184,0.25)]
dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]
```

Inner panels / nested cards:
```
rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60
```

---

## Status convention

| Status     | Color   | Dot class         |
|------------|---------|-------------------|
| success    | emerald | `bg-emerald-400`  |
| running    | sky     | `bg-sky-400 animate-pulse` |
| pending    | amber   | `bg-amber-400`    |
| failed     | rose    | `bg-rose-400`     |
| queued     | slate   | `bg-slate-400`    |

---

## Typography scale

| Role              | Class                                          |
|-------------------|------------------------------------------------|
| Page title        | `text-xl font-semibold sm:text-2xl`            |
| Section heading   | `text-sm font-semibold`                        |
| Kicker / eyebrow  | `text-[10px] font-semibold uppercase tracking-[0.18em]` |
| Body              | `text-sm text-slate-600 dark:text-slate-300`   |
| Small label       | `text-[11px] text-slate-500`                   |
| Monospace         | `font-mono text-[12px]`                        |

---

## Toast notifications

```tsx
<div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200">
  {message}
</div>
```

Error toasts swap emerald → rose.

---

## Error pages

| Page                   | File                     | Color palette        |
|------------------------|--------------------------|----------------------|
| 404 Not Found          | `src/app/not-found.tsx`  | indigo/violet/cyan   |
| Global error boundary  | `src/app/error.tsx`      | rose/orange/amber    |

Both are dark-forced and use the full ambient glow + dot grid + top stripe pattern.
