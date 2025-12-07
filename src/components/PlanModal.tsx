"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Define sections with titles and their respective items
const sections = [
  {
    title: "AI Extraction & Content",
    items: [
      { name: "Extract", href: "/dashboard/extract" },
      { name: "Describe", href: "/dashboard/describe" },
      { name: "SEO", href: "/dashboard/seo" },
      { name: "Translate", href: "/dashboard/translate" },
      { name: "Cluster", href: "/dashboard/cluster" },
      { name: "Studio", href: "/dashboard/studio" },
    ],
  },
  {
    title: "Data Intelligence",
    items: [
      { name: "Match", href: "/dashboard/match" },
      { name: "Variants", href: "/dashboard/variants" },
      { name: "Specs", href: "/dashboard/specs" },
      { name: "Docs", href: "/dashboard/docs" },
      { name: "Images", href: "/dashboard/images" },
    ],
  },
  {
    title: "Commerce & Automation",
    items: [
      { name: "Import", href: "/dashboard/import" },
      { name: "Audit", href: "/dashboard/audit" },
      { name: "Price", href: "/dashboard/price" },
      { name: "Feeds", href: "/dashboard/feeds" },
      { name: "Monitor", href: "/dashboard/monitor" },
    ],
  },
  {
    title: "Developer Tools",
    items: [
      { name: "Browser", href: "/dashboard/browser" },
      { name: "API", href: "/dashboard/api" },
    ],
  },
];

// Accent design system: map product name → accent classes
function getAccentClasses(name: string) {
  const key = name.toLowerCase();

  // Core modules with known palettes
  if (key === "extract") {
    return {
      dot: "bg-cyan-400",
      activeBorder: "border-cyan-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-cyan-50",
      pillGlow: "shadow-[0_0_18px_rgba(34,211,238,0.45)]",
    };
  }

  if (key === "describe") {
    return {
      dot: "bg-fuchsia-400",
      activeBorder: "border-fuchsia-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-fuchsia-50",
      pillGlow: "shadow-[0_0_18px_rgba(236,72,153,0.45)]",
    };
  }

  if (key === "seo") {
    return {
      dot: "bg-emerald-400",
      activeBorder: "border-emerald-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-emerald-50",
      pillGlow: "shadow-[0_0_18px_rgba(16,185,129,0.45)]",
    };
  }

  // Translate / Studio / Images → sky family
  if (key === "translate" || key === "studio" || key === "images") {
    return {
      dot: "bg-sky-400",
      activeBorder: "border-sky-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-sky-50",
      pillGlow: "shadow-[0_0_18px_rgba(56,189,248,0.45)]",
    };
  }

  // Cluster / Docs / Browser → violet family
  if (key === "cluster" || key === "docs" || key === "browser") {
    return {
      dot: "bg-violet-400",
      activeBorder: "border-violet-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-violet-50",
      pillGlow: "shadow-[0_0_18px_rgba(139,92,246,0.4)]",
    };
  }

  // Data Intelligence + Monitor → amber (change / insights)
  if (key === "match" || key === "variants" || key === "specs" || key === "monitor") {
    return {
      dot: "bg-amber-400",
      activeBorder: "border-amber-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-amber-50",
      pillGlow: "shadow-[0_0_18px_rgba(245,158,11,0.4)]",
    };
  }

  // Commerce & Automation feeds / pricing backbone → emerald
  if (key === "import" || key === "feeds" || key === "price") {
    return {
      dot: "bg-emerald-400",
      activeBorder: "border-emerald-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-emerald-50",
      pillGlow: "shadow-[0_0_18px_rgba(16,185,129,0.4)]",
    };
  }

  // Audit → rose (QA / warnings)
  if (key === "audit") {
    return {
      dot: "bg-rose-400",
      activeBorder: "border-rose-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-rose-50",
      pillGlow: "shadow-[0_0_18px_rgba(244,63,94,0.4)]",
    };
  }

  // API (dev surface) → cyan
  if (key === "api") {
    return {
      dot: "bg-cyan-400",
      activeBorder: "border-cyan-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-cyan-50",
      pillGlow: "shadow-[0_0_18px_rgba(34,211,238,0.45)]",
    };
  }

  // Fallback neutral style
  return {
    dot: "bg-slate-400",
    activeBorder: "border-slate-500/70",
    activeBg: "bg-slate-900/95",
    textActive: "text-slate-50",
    pillGlow: "shadow-[0_0_14px_rgba(148,163,184,0.35)]",
  };
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="AvidiaTech main navigation"
      className="fixed top-[56px] bottom-0 left-0 flex w-56 flex-col overflow-hidden bg-slate-950/98 border-r border-slate-800/80 px-3 py-4 text-slate-100"
    >
      {/* Brand / context */}
      <div className="mb-3 px-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              AvidiaTech
            </span>
            <span className="text-[12px] font-semibold text-slate-50">
              Product Data OS
            </span>
          </div>
          <div className="rounded-xl bg-slate-900/90 border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-200">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Live workspace</span>
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable section area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
        {sections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 && (
              <div className="my-2 h-px bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent" />
            )}
            <h2 className="px-2 mb-1 text-[7px] font-medium uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap">
              {section.title}
            </h2>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const accent = getAccentClasses(item.name);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-medium border",
                        "transition-all duration-150 ease-out",
                        "hover:bg-slate-900 hover:border-slate-500/70 hover:translate-x-[2px]",
                        active
                          ? [
                              accent.activeBg,
                              accent.activeBorder,
                              accent.pillGlow,
                              "text-slate-50",
                            ].join(" ")
                          : "bg-transparent border-transparent text-slate-200",
                      ].join(" ")}
                    >
                      {/* Accent dot / icon placeholder */}
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                          active
                            ? accent.dot
                            : "bg-slate-500 group-hover:bg-slate-300",
                        ].join(" ")}
                      />

                      {/* Item label */}
                      <span
                        className={[
                          "flex-1 truncate",
                          active
                            ? accent.textActive
                            : "text-slate-200 group-hover:text-slate-50",
                        ].join(" ")}
                      >
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

      {/* Pinned bottom premium support block */}
      <div className="mt-3 shrink-0 border-t border-slate-800/80 px-2 pt-3 text-[10px] text-slate-500">
        <div className="flex flex-col gap-1.5">
          {/* Primary support chat */}
          <button
            type="button"
            className="group inline-flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-2 text-left text-[10px] text-slate-100 shadow-[0_0_18px_rgba(15,23,42,0.85)] hover:border-cyan-400/80 hover:bg-slate-900"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px]">
                💬
              </span>
              <span className="font-medium">Open support chat</span>
            </span>
            <span className="text-[9px] text-slate-400 group-hover:text-cyan-300">
              Live & async
            </span>
          </button>

          {/* Documentation / guides */}
          <button
            type="button"
            className="group inline-flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-left text-[10px] text-slate-200 hover:border-violet-400/80 hover:bg-slate-900"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px]">
                📚
              </span>
              <span className="font-medium">Documentation &amp; guides</span>
            </span>
            <span className="text-[9px] text-slate-500 group-hover:text-violet-300">
              Playbooks & how-tos
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
