"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Navigation structure ────────────────────────────────────────────────────
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
      { name: "Import",   href: "/dashboard/import" },
      { name: "Audit",    href: "/dashboard/audit" },
      { name: "Price",    href: "/dashboard/price" },
      { name: "Feeds",    href: "/dashboard/feeds" },
      { name: "Monitor",  href: "/dashboard/monitor" },
    ],
  },
  {
    title: "Developer",
    items: [
      { name: "Browser", href: "/dashboard/browser" },
      { name: "API",     href: "/dashboard/api" },
    ],
  },
];

// ─── Per-product accent palette ───────────────────────────────────────────────
type AccentConfig = {
  dot:         string;   // Tailwind class for the colored dot
  activeLine:  string;   // left-rail accent bar color
  activeText:  string;   // active item text color
  activeBg:    string;   // active item bg
  activeBorder:string;   // active border tint
  glow:        string;   // box-shadow for active glow
};

function getAccent(name: string): AccentConfig {
  const k = name.toLowerCase();

  if (k === "extract" || k === "api") return {
    dot:          "bg-cyan-400",
    activeLine:   "bg-cyan-400",
    activeText:   "text-cyan-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-cyan-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(34,211,238,0.7)]",
  };
  if (k === "describe") return {
    dot:          "bg-fuchsia-400",
    activeLine:   "bg-fuchsia-400",
    activeText:   "text-fuchsia-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-fuchsia-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(232,121,249,0.7)]",
  };
  if (k === "seo") return {
    dot:          "bg-emerald-400",
    activeLine:   "bg-emerald-400",
    activeText:   "text-emerald-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-emerald-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(52,211,153,0.7)]",
  };
  if (k === "translate" || k === "studio" || k === "images") return {
    dot:          "bg-sky-400",
    activeLine:   "bg-sky-400",
    activeText:   "text-sky-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-sky-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(56,189,248,0.7)]",
  };
  if (k === "cluster" || k === "docs" || k === "browser") return {
    dot:          "bg-violet-400",
    activeLine:   "bg-violet-400",
    activeText:   "text-violet-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-violet-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(167,139,250,0.7)]",
  };
  if (k === "match" || k === "variants" || k === "specs" || k === "monitor") return {
    dot:          "bg-amber-400",
    activeLine:   "bg-amber-400",
    activeText:   "text-amber-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-amber-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(251,191,36,0.7)]",
  };
  if (k === "import" || k === "feeds" || k === "price") return {
    dot:          "bg-emerald-400",
    activeLine:   "bg-emerald-400",
    activeText:   "text-emerald-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-emerald-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(52,211,153,0.7)]",
  };
  if (k === "audit") return {
    dot:          "bg-rose-400",
    activeLine:   "bg-rose-400",
    activeText:   "text-rose-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-rose-500/40",
    glow:         "shadow-[inset_3px_0_0_rgba(251,113,133,0.7)]",
  };
  // fallback
  return {
    dot:          "bg-slate-400",
    activeLine:   "bg-slate-400",
    activeText:   "text-slate-300",
    activeBg:     "bg-slate-800/60",
    activeBorder: "border-slate-600/40",
    glow:         "shadow-[inset_3px_0_0_rgba(148,163,184,0.5)]",
  };
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

// ─── Component ────────────────────────────────────────────────────────────────
type SidebarProps = {
  variant?: "desktop" | "drawer";
};

export default function Sidebar({ variant = "desktop" }: SidebarProps) {
  const pathname = usePathname();
  const isDesktop = variant === "desktop";

  // Desktop: fixed dark rail. Drawer: adapts to light/dark
  const positionClasses = isDesktop
    ? "fixed top-[58px] bottom-12 left-0 w-56"
    : "relative h-full w-full";

  const baseClasses = isDesktop
    ? [
        "flex flex-col overflow-hidden",
        "bg-slate-950 border-r border-slate-800/60",
        "px-2 py-3 text-slate-100",
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
            {/* Section divider (except first) */}
            {sIdx > 0 && (
              <div className="mx-1 mb-3 h-px bg-slate-800/80" />
            )}

            {/* Section label */}
            <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.title}
            </p>

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const accent = getAccent(item.name);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        // Base layout
                        "group flex items-center gap-2.5 rounded-lg px-3 py-[7px]",
                        "text-[12.5px] font-medium",
                        "border transition-all duration-100",
                        // Active vs inactive
                        active
                          ? [
                              accent.activeBg,
                              "border-transparent",
                              accent.glow,
                              accent.activeText,
                            ].join(" ")
                          : [
                              "border-transparent text-slate-400",
                              "hover:bg-slate-800/50 hover:text-slate-200",
                            ].join(" "),
                      ].join(" ")}
                    >
                      {/* Colored accent dot */}
                      <span
                        className={[
                          "h-[5px] w-[5px] shrink-0 rounded-full transition-colors duration-100",
                          active
                            ? accent.dot
                            : "bg-slate-700 group-hover:bg-slate-500",
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

      {/* ── Pinned bottom: support + docs ─────────────────────────────────── */}
      <div className="mt-3 shrink-0 space-y-0.5 border-t border-slate-800/80 pt-2.5">
        <Link
          href="/dashboard/support"
          className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-slate-300"
          aria-label="Open support"
        >
          <HelpIcon />
          <span>Support</span>
        </Link>
        <Link
          href="/docs"
          className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-slate-300"
          aria-label="Documentation"
        >
          <BookIcon />
          <span>Documentation</span>
        </Link>
      </div>
    </nav>
  );
}
