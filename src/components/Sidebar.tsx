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

// Simple accent system: only color for the tiny dot
function getDotClass(name: string) {
  const key = name.toLowerCase();

  if (key === "extract") return "bg-cyan-400";
  if (key === "describe") return "bg-fuchsia-400";
  if (key === "seo") return "bg-emerald-400";

  if (key === "translate" || key === "studio" || key === "images") {
    return "bg-sky-400";
  }

  if (key === "cluster" || key === "docs" || key === "browser") {
    return "bg-violet-400";
  }

  if (key === "match" || key === "variants" || key === "specs" || key === "monitor") {
    return "bg-amber-400";
  }

  if (key === "import" || key === "feeds" || key === "price") {
    return "bg-emerald-400";
  }

  if (key === "audit") return "bg-rose-400";
  if (key === "api") return "bg-cyan-400";

  return "bg-slate-400";
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

      {/* Scrollable menu region with vertical scrollbar.
          Only this middle block scrolls; top + bottom stay fixed. */}
      <div
        className="
          flex-1 space-y-3 overflow-y-auto pr-1
          scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40
        "
      >
        {sections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 && (
              <div className="my-2 h-px bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent" />
            )}

            {/* Section heading – smaller, no truncation */}
            <div className="mb-1 px-2">
              <h2 className="text-[10px] font-medium text-slate-400">
                {section.title}
              </h2>
            </div>

            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const dotClass = getDotClass(item.name);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium",
                        "transition-colors duration-150 ease-out",
                        active
                          ? "border-slate-600 bg-slate-900/90 text-slate-50"
                          : "border-slate-900 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70",
                      ].join(" ")}
                    >
                      {/* Small colored dot */}
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                          active ? dotClass : `bg-slate-600 group-hover:${dotClass}`,
                        ].join(" ")}
                      />

                      {/* Item label */}
                      <span className="flex-1 truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom meta – pinned at bottom via flex layout; does not scroll */}
      <div className="mt-3 shrink-0 border-t border-slate-800/80 px-2 pt-3 text-[10px] text-slate-500">
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
