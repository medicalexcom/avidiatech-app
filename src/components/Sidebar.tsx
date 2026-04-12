"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Navigation structure ─────────────────────────────────────────────────────
const sections = [
  {
    title: "AI Extraction & Content",
    items: [
      { name: "Extract",   href: "/dashboard/extract" },
      { name: "Describe",  href: "/dashboard/describe" },
      { name: "SEO",       href: "/dashboard/seo" },
      { name: "Translate", href: "/dashboard/translate" },
      { name: "Cluster",   href: "/dashboard/cluster" },
      { name: "Studio",    href: "/dashboard/studio" },
    ],
  },
  {
    title: "Data Intelligence",
    items: [
      { name: "Match",    href: "/dashboard/match" },
      { name: "Variants", href: "/dashboard/variants" },
      { name: "Specs",    href: "/dashboard/specs" },
      { name: "Docs",     href: "/dashboard/docs" },
      { name: "Images",   href: "/dashboard/images" },
    ],
  },
  {
    title: "Commerce & Automation",
    items: [
      { name: "Import",       href: "/dashboard/import" },
      { name: "Audit",        href: "/dashboard/audit" },
      { name: "Price",        href: "/dashboard/price" },
      { name: "Feeds",        href: "/dashboard/feeds" },
      { name: "Monitor",      href: "/dashboard/monitor" },
      { name: "Integrations", href: "/dashboard/integrations", key: "integrations" },
      { name: "Bulk",         href: "/dashboard/bulk",         key: "bulk" },
    ],
  },
  {
    title: "Developer",
    items: [
      { name: "Browser",  href: "/dashboard/browser",  key: "browser" },
      { name: "API",      href: "/dashboard/api",      key: "api" },
      { name: "API Keys", href: "/dashboard/api-keys", key: "api-keys" },
    ],
  },
];

// ─── Module color registry ────────────────────────────────────────────────────
//
// ONE color per module — must exactly match the `glow` preset on each page.
// Design rule: within each sidebar section, every item has a distinct color.
//
//  Section 1 – AI Extraction & Content
//    Extract   → amber    (raw material, gold)
//    Describe  → violet   (AI prose, language)
//    SEO       → emerald  (growth, search ranking)
//    Translate → sky      (global communication)
//    Cluster   → indigo   (deep grouping, cosmos)
//    Studio    → fuchsia  (creative, vibrant)
//
//  Section 2 – Data Intelligence
//    Match     → cyan     (precision matching)
//    Variants  → rose     (branching, options)
//    Specs     → teal     (measured, technical)
//    Docs      → orange   (documents, warm paper)
//    Images    → coral    (visual, artistic warmth)
//
//  Section 3 – Commerce & Automation
//    Import    → emerald  (data in-flow, growth)
//    Audit     → rose     (quality review)
//    Price     → amber    (gold = money)
//    Feeds     → orange   (broadcast, distribution)
//    Monitor   → sky      (surveillance, sky view)
//
//  Section 4 – Developer
//    Browser   → cyan     (internet, tech)
//    API       → indigo   (deep technical, endpoints)
//
type AccentConfig = {
  dot:          string;  // colored dot class
  activeText:   string;  // active item text color
  activeBg:     string;  // active item bg tint
  glow:         string;  // left-rail inset shadow
  hoverText:    string;  // inactive hover text
};

const MODULE_COLORS: Record<string, AccentConfig> = {

  // ── amber ─────────────────────────────────────────────────────────────────
  extract: {
    dot:        "bg-amber-400",
    activeText: "text-amber-700 dark:text-amber-300",
    activeBg:   "bg-amber-50 dark:bg-amber-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(251,191,36,0.75)]",
    hoverText:  "hover:text-amber-700 dark:hover:text-amber-200",
  },
  price: {
    dot:        "bg-amber-400",
    activeText: "text-amber-700 dark:text-amber-300",
    activeBg:   "bg-amber-50 dark:bg-amber-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(251,191,36,0.75)]",
    hoverText:  "hover:text-amber-700 dark:hover:text-amber-200",
  },

  // ── violet ────────────────────────────────────────────────────────────────
  describe: {
    dot:        "bg-violet-400",
    activeText: "text-violet-700 dark:text-violet-300",
    activeBg:   "bg-violet-50 dark:bg-violet-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(167,139,250,0.75)]",
    hoverText:  "hover:text-violet-700 dark:hover:text-violet-200",
  },

  // ── emerald ───────────────────────────────────────────────────────────────
  seo: {
    dot:        "bg-emerald-400",
    activeText: "text-emerald-700 dark:text-emerald-300",
    activeBg:   "bg-emerald-50 dark:bg-emerald-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(52,211,153,0.75)]",
    hoverText:  "hover:text-emerald-700 dark:hover:text-emerald-200",
  },
  import: {
    dot:        "bg-emerald-400",
    activeText: "text-emerald-700 dark:text-emerald-300",
    activeBg:   "bg-emerald-50 dark:bg-emerald-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(52,211,153,0.75)]",
    hoverText:  "hover:text-emerald-700 dark:hover:text-emerald-200",
  },

  // ── sky ───────────────────────────────────────────────────────────────────
  translate: {
    dot:        "bg-sky-400",
    activeText: "text-sky-700 dark:text-sky-300",
    activeBg:   "bg-sky-50 dark:bg-sky-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(56,189,248,0.75)]",
    hoverText:  "hover:text-sky-700 dark:hover:text-sky-200",
  },
  monitor: {
    dot:        "bg-sky-400",
    activeText: "text-sky-700 dark:text-sky-300",
    activeBg:   "bg-sky-50 dark:bg-sky-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(56,189,248,0.75)]",
    hoverText:  "hover:text-sky-700 dark:hover:text-sky-200",
  },

  // ── indigo ────────────────────────────────────────────────────────────────
  cluster: {
    dot:        "bg-indigo-400",
    activeText: "text-indigo-700 dark:text-indigo-300",
    activeBg:   "bg-indigo-50 dark:bg-indigo-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(129,140,248,0.75)]",
    hoverText:  "hover:text-indigo-700 dark:hover:text-indigo-200",
  },
  api: {
    dot:        "bg-indigo-400",
    activeText: "text-indigo-700 dark:text-indigo-300",
    activeBg:   "bg-indigo-50 dark:bg-indigo-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(129,140,248,0.75)]",
    hoverText:  "hover:text-indigo-700 dark:hover:text-indigo-200",
  },

  // ── fuchsia ───────────────────────────────────────────────────────────────
  studio: {
    dot:        "bg-fuchsia-400",
    activeText: "text-fuchsia-700 dark:text-fuchsia-300",
    activeBg:   "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(232,121,249,0.75)]",
    hoverText:  "hover:text-fuchsia-700 dark:hover:text-fuchsia-200",
  },

  // ── cyan ──────────────────────────────────────────────────────────────────
  match: {
    dot:        "bg-cyan-400",
    activeText: "text-cyan-700 dark:text-cyan-300",
    activeBg:   "bg-cyan-50 dark:bg-cyan-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(34,211,238,0.75)]",
    hoverText:  "hover:text-cyan-700 dark:hover:text-cyan-200",
  },
  browser: {
    dot:        "bg-cyan-400",
    activeText: "text-cyan-700 dark:text-cyan-300",
    activeBg:   "bg-cyan-50 dark:bg-cyan-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(34,211,238,0.75)]",
    hoverText:  "hover:text-cyan-700 dark:hover:text-cyan-200",
  },

  // ── rose ──────────────────────────────────────────────────────────────────
  variants: {
    dot:        "bg-rose-400",
    activeText: "text-rose-700 dark:text-rose-300",
    activeBg:   "bg-rose-50 dark:bg-rose-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(251,113,133,0.75)]",
    hoverText:  "hover:text-rose-700 dark:hover:text-rose-200",
  },
  audit: {
    dot:        "bg-rose-400",
    activeText: "text-rose-700 dark:text-rose-300",
    activeBg:   "bg-rose-50 dark:bg-rose-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(251,113,133,0.75)]",
    hoverText:  "hover:text-rose-700 dark:hover:text-rose-200",
  },

  // ── teal ──────────────────────────────────────────────────────────────────
  specs: {
    dot:        "bg-teal-400",
    activeText: "text-teal-700 dark:text-teal-300",
    activeBg:   "bg-teal-50 dark:bg-teal-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(45,212,191,0.75)]",
    hoverText:  "hover:text-teal-700 dark:hover:text-teal-200",
  },

  // ── orange ────────────────────────────────────────────────────────────────
  docs: {
    dot:        "bg-orange-400",
    activeText: "text-orange-700 dark:text-orange-300",
    activeBg:   "bg-orange-50 dark:bg-orange-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(251,146,60,0.75)]",
    hoverText:  "hover:text-orange-700 dark:hover:text-orange-200",
  },
  feeds: {
    dot:        "bg-orange-400",
    activeText: "text-orange-700 dark:text-orange-300",
    activeBg:   "bg-orange-50 dark:bg-orange-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(251,146,60,0.75)]",
    hoverText:  "hover:text-orange-700 dark:hover:text-orange-200",
  },

  // ── coral ─────────────────────────────────────────────────────────────────
  images: {
    dot:        "bg-red-400",
    activeText: "text-red-700 dark:text-red-300",
    activeBg:   "bg-red-50 dark:bg-red-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(248,113,113,0.75)]",
    hoverText:  "hover:text-red-700 dark:hover:text-red-200",
  },

  // ── indigo (integrations, api-keys) ───────────────────────────────────────
  integrations: {
    dot:        "bg-indigo-400",
    activeText: "text-indigo-700 dark:text-indigo-300",
    activeBg:   "bg-indigo-50 dark:bg-indigo-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(129,140,248,0.75)]",
    hoverText:  "hover:text-indigo-700 dark:hover:text-indigo-200",
  },
  "api-keys": {
    dot:        "bg-indigo-400",
    activeText: "text-indigo-700 dark:text-indigo-300",
    activeBg:   "bg-indigo-50 dark:bg-indigo-500/10",
    glow:       "shadow-[inset_3px_0_0_rgba(129,140,248,0.75)]",
    hoverText:  "hover:text-indigo-700 dark:hover:text-indigo-200",
  },

  // ── slate (bulk jobs) ─────────────────────────────────────────────────────
  bulk: {
    dot:        "bg-slate-400",
    activeText: "text-slate-700 dark:text-slate-300",
    activeBg:   "bg-slate-100 dark:bg-slate-800/60",
    glow:       "shadow-[inset_3px_0_0_rgba(148,163,184,0.75)]",
    hoverText:  "hover:text-slate-700 dark:hover:text-slate-200",
  },
};

// Fallback for any module not in the registry
const FALLBACK: AccentConfig = {
  dot:        "bg-slate-500",
  activeText: "text-slate-700 dark:text-slate-300",
  activeBg:   "bg-slate-100 dark:bg-slate-800/60",
  glow:       "shadow-[inset_3px_0_0_rgba(148,163,184,0.5)]",
  hoverText:  "hover:text-slate-700 dark:hover:text-slate-200",
};

function getAccent(name: string): AccentConfig {
  return MODULE_COLORS[name.toLowerCase()] ?? FALLBACK;
}

// ─── SVG micro-icons ──────────────────────────────────────────────────────────
function HelpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M6.5 6a1.5 1.5 0 011.5-1.5 1.5 1.5 0 010 3C8 7.5 8 8.5 8 9" />
      <circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M3 3.5A1.5 1.5 0 014.5 2h8.5v12H4.5A1.5 1.5 0 013 12.5v-9z" />
      <line x1="6" y1="6" x2="10.5" y2="6" />
      <line x1="6" y1="8.5" x2="10.5" y2="8.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
      <path d="M4.343 4.343l1.414 1.414M10.243 10.243l1.414 1.414M4.343 11.657l1.414-1.414M10.243 5.757l1.414-1.414" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
type SidebarProps = {
  variant?: "desktop" | "drawer";
};

export default function Sidebar({ variant = "desktop" }: SidebarProps) {
  const pathname = usePathname();
  const isDesktop = variant === "desktop";

  const positionClasses = isDesktop
    ? "fixed top-[58px] bottom-12 left-0 w-56"
    : "relative h-full w-full";

  const baseClasses = isDesktop
    ? [
        "flex flex-col overflow-hidden",
        "bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800/60",
        "px-2 py-3 text-slate-900 dark:text-slate-100",
      ].join(" ")
    : [
        "flex flex-col overflow-hidden",
        "bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800/60",
        "px-2 py-3 text-slate-900 dark:text-slate-100",
      ].join(" ");

  return (
    <nav
      aria-label="AvidiaTech main navigation"
      className={`${positionClasses} ${baseClasses}`}
    >
      {/* Scrollable nav content */}
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-0.5">
        {sections.map((section, sIdx) => (
          <div key={section.title}>
            {sIdx > 0 && (
              <div className="mx-1 mb-3 h-px bg-slate-200 dark:bg-slate-800/80" />
            )}

            <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.title}
            </p>

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active  = pathname === item.href ||
                                pathname.startsWith(item.href + "/");
                const accent  = getAccent((item as { name: string; href: string; key?: string }).key ?? item.name);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex items-center gap-2.5 rounded-lg px-3 py-[7px]",
                        "text-[12.5px] font-medium",
                        "border border-transparent transition-all duration-150",
                        active
                          ? [
                              accent.activeBg,
                              accent.glow,
                              accent.activeText,
                              "border-white/5",
                            ].join(" ")
                          : [
                              "text-slate-500 dark:text-slate-400",
                              "hover:bg-slate-100 dark:hover:bg-slate-800/40",
                              accent.hoverText,
                            ].join(" "),
                      ].join(" ")}
                    >
                      {/* Colored accent dot */}
                      <span
                        className={[
                          "h-[5px] w-[5px] shrink-0 rounded-full transition-all duration-150",
                          active
                            ? accent.dot
                            : "bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500",
                        ].join(" ")}
                      />

                      {/* Label */}
                      <span className="flex-1 truncate leading-none">
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Pinned bottom: assistant + support + docs ──────────────────────── */}
      <div className="mt-3 shrink-0 space-y-0.5 border-t border-slate-200 dark:border-slate-800/80 pt-2.5">
        <Link
          href="/dashboard/assistant"
          className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="AI Assistant"
        >
          <SparkleIcon />
          <span>AI Assistant</span>
        </Link>
        <Link
          href="/dashboard/support"
          className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="Open support"
        >
          <HelpIcon />
          <span>Support</span>
        </Link>
        <Link
          href="/docs"
          className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="Documentation"
        >
          <BookIcon />
          <span>Documentation</span>
        </Link>
      </div>
    </nav>
  );
}
