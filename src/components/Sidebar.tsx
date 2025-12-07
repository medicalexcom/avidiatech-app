"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Define sections with titles and their respective items
const sections = [
  {
    title: "AI Extraction & Content",
    tag: "AI content",
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
    tag: "Signals",
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
    tag: "Ops",
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
    tag: "Dev",
    items: [
      { name: "Browser", href: "/dashboard/browser" },
      { name: "API", href: "/dashboard/api" },
    ],
  },
];

// Accent design system: map product name → accent classes
function getAccentClasses(name: string) {
  const key = name.toLowerCase();

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

  // Data Intelligence + Monitor → amber
  if (key === "match" || key === "variants" || key === "specs" || key === "monitor") {
    return {
      dot: "bg-amber-400",
      activeBorder: "border-amber-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-amber-50",
      pillGlow: "shadow-[0_0_18px_rgba(245,158,11,0.4)]",
    };
  }

  // Commerce & Automation → emerald
  if (key === "import" || key === "feeds" || key === "price") {
    return {
      dot: "bg-emerald-400",
      activeBorder: "border-emerald-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-emerald-50",
      pillGlow: "shadow-[0_0_18px_rgba(16,185,129,0.4)]",
    };
  }

  // Audit → rose
  if (key === "audit") {
    return {
      dot: "bg-rose-400",
      activeBorder: "border-rose-500/70",
      activeBg: "bg-slate-900/95",
      textActive: "text-rose-50",
      pillGlow: "shadow-[0_0_18px_rgba(244,63,94,0.4)]",
    };
  }

  // API → cyan
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
    <aside
      aria-label="AvidiaTech main navigation"
      className="flex h-screen w-60 flex-col border-r border-slate-800/80 bg-slate-950/98 px-3 py-4 text-slate-100 md:w-56"
    >
      {/* Brand / context */}
      <div className="mb-3 px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-slate-500">
              AvidiaTech
            </span>
            <span className="text-[12px] font-semibold text-slate-50">
              Product Data OS
            </span>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-[10px] text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Live workspace</span>
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable menu region with vertical scrollbar */}
      <div
        className={`
          flex-1 overflow-y-auto pr-1
          space-y-3
          scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40
        `}
      >
        {sections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 && (
              <div className="my-2 h-px bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent" />
            )}

            {/* Section heading row: small, single-line, truncated if needed */}
            <div className="mb-1 flex items-center justify-between px-2">
              <h2 className="max-w-[60%] truncate text-[10px] font-medium text-slate-400">
                {section.title}
              </h2>
              {section.tag && (
                <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-500 ring-1 ring-slate-800">
                  {section.tag}
                </span>
              )}
            </div>

            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const accent = getAccentClasses(item.name);

                return (
                  <li key={item.href} className="relative">
                    {/* Vertical active rail – purely visual, no layout jump */}
                    <span
                      className={[
                        "pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full transition-opacity duration-150",
                        active
                          ? `${accent.dot} opacity-100`
                          : "bg-slate-700 opacity-0",
                      ].join(" ")}
                    />

                    <Link
                      href={item.href}
                      className={[
                        "group relative ml-2 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium",
                        "transition-colors duration-150 ease-out",
                        active
                          ? [
                              accent.activeBg,
                              accent.activeBorder,
                              accent.pillGlow,
                              "text-slate-50",
                            ].join(" ")
                          : "border-slate-800/70 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70",
                      ].join(" ")}
                    >
                      {/* Accent dot */}
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

                      {/* Tiny tag on hover */}
                      <span className="text-[9px] text-slate-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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

      {/* Bottom meta: version + support / chat / status */}
      <div className="mt-3 border-t border-slate-800/80 px-2 pt-3 text-[10px] text-slate-500">
        <div className="mb-2 flex items-center justify-between">
          <span>AvidiaTech • Dashboard</span>
          <span className="text-slate-600">v0.1</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-left text-[10px] text-slate-300 hover:bg-slate-800/90"
          >
            <span>💬</span>
            <span>Open support chat</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900/60 px-2 py-1 text-left text-[10px] text-slate-400 hover:bg-slate-900"
          >
            <span>📚</span>
            <span>Documentation &amp; guides</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900/60 px-2 py-1 text-left text-[10px] text-slate-400 hover:bg-slate-900"
          >
            <span>🟢</span>
            <span>System status: all good</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
