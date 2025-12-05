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

  // Reasonable defaults for the rest (aligned with module themes)
  if (key === "translate" || key === "studio" || key === "images") {
    return {
      dot: "bg-sky-400",
      activeBorder: "border-sky-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-sky-50",
      pillGlow: "shadow-[0_0_18px_rgba(56,189,248,0.45)]",
    };
  }
  if (key === "cluster" || key === "docs" || key === "browser") {
    return {
      dot: "bg-violet-400",
      activeBorder: "border-violet-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-violet-50",
      pillGlow: "shadow-[0_0_18px_rgba(139,92,246,0.4)]",
    };
  }
  if (key === "match" || key === "variants" || key === "specs") {
    return {
      dot: "bg-amber-400",
      activeBorder: "border-amber-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-amber-50",
      pillGlow: "shadow-[0_0_18px_rgba(245,158,11,0.4)]",
    };
  }
  if (key === "import" || key === "feeds" || key === "api") {
    return {
      dot: "bg-emerald-400",
      activeBorder: "border-emerald-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-emerald-50",
      pillGlow: "shadow-[0_0_18px_rgba(16,185,129,0.4)]",
    };
  }
  if (key === "audit" || key === "price" || key === "monitor") {
    return {
      dot: "bg-rose-400",
      activeBorder: "border-rose-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-rose-50",
      pillGlow: "shadow-[0_0_18px_rgba(244,63,94,0.4)]",
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
      className="flex h-full min-h-screen flex-col bg-slate-950/98 border-r border-slate-800/80 px-3 py-4 text-slate-100"
    >
      {/* Brand / context */}
      <div className="mb-4 px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              AvidiaTech
            </span>
            <span className="text-sm font-semibold text-slate-50">
              Product Data OS
            </span>
          </div>
          <div className="rounded-xl bg-slate-900/90 border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Live workspace</span>
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable section area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {sections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 && (
              <div className="my-3 h-px bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent" />
            )}
            <h2 className="px-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              {section.title}
            </h2>
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const accent = getAccentClasses(item.name);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border",
                        "transition-all duration-150 ease-out",
                        "hover:bg-slate-900/80 hover:border-slate-600/80 hover:translate-x-[2px]",
                        active
                          ? [
                              accent.activeBg,
                              accent.activeBorder,
                              accent.pillGlow,
                              "text-slate-50",
                            ].join(" ")
                          : "bg-transparent border-transparent text-slate-300",
                      ].join(" ")}
                    >
                      {/* Accent dot / icon placeholder */}
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                          active
                            ? accent.dot
                            : "bg-slate-600 group-hover:bg-slate-400",
                        ].join(" ")}
                      />

                      {/* Item label */}
                      <span
                        className={[
                          "flex-1 truncate",
                          active ? accent.textActive : "text-slate-300",
                        ].join(" ")}
                      >
                        {item.name}
                      </span>

                      {/* Tiny tag to hint category state on hover */}
                      <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {sectionIndex === 0
                          ? "AI"
                          : sectionIndex === 1
                          ? "Data"
                          : sectionIndex === 2
                          ? "Commerce"
                          : "Dev"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom meta (optional) */}
      <div className="mt-4 border-t border-slate-800/80 pt-3 px-2 text-[10px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>AvidiaTech • Dashboard</span>
          <span className="text-slate-600">v0.1</span>
        </div>
      </div>
    </nav>
  );
}
