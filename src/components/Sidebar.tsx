"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Props made optional so Sidebar can be used both as:
// <Sidebar /> (desktop/static) and <Sidebar open onClose={...} /> (mobile/off-canvas)
type Props = {
  open?: boolean;
  onClose?: () => void;
};

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

  // Fallback
  return {
    dot: "bg-slate-400",
    activeBorder: "border-slate-500/70",
    activeBg: "bg-slate-900/95",
    textActive: "text-slate-50",
    pillGlow: "shadow-[0_0_14px_rgba(148,163,184,0.35)]",
  };
}

export default function Sidebar({ open = false, onClose = () => {} }: Props) {
  const pathname = usePathname();

  // Close on escape only when the off-canvas is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    return;
  }, [open, onClose]);

  // Treat truthy open as off-canvas open; when no props provided (desktop use),
  // open will be false but md:translate-x-0 via CSS keeps the sidebar visible on desktop.
  const isOpen = Boolean(open);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 z-30 bg-black bg-opacity-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        } md:hidden`}
        aria-hidden={!isOpen}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={`fixed top-[56px] left-0 z-40 h-[calc(100vh-56px)] w-56 bg-slate-950/98 border-r border-slate-800/80 px-3 py-4 text-slate-100 transform transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:shadow-none`}
        role="navigation"
        aria-label="AvidiaTech main navigation"
      >
        {/* Small top spacer so content isn’t glued to the top */}
        <div className="mb-1 shrink-0" />

        {/* Scrollable section area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
          {sections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && (
                <div className="my-2 h-px bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent" />
              )}
              <h2 className="px-2 mb-1 text-[7px] font-medium uppercase tracking-[0.12em] text-slate-900 dark:text-slate-300 whitespace-nowrap">
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
                        onClick={() => {
                          // close on navigation (mobile)
                          if (isOpen) onClose();
                        }}
                      >
                        {/* Accent dot / icon placeholder */}
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                            active ? accent.dot : "bg-slate-500 group-hover:bg-slate-300",
                          ].join(" ")}
                        />

                        {/* Item label */}
                        <span className="flex-1 truncate text-slate-600 group-hover:text-slate-50">
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

        {/* Pinned bottom simple support block, light/dark friendly */}
        <div className="mt-3 shrink-0 border-t border-slate-200/20 px-2 pt-3 text-[10px] text-slate-600 dark:border-slate-800/80 dark:text-slate-500">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="inline-flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[10px] text-slate-700 hover:bg-slate-100/10 dark:text-slate-200 dark:hover:bg-slate-900/80"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] dark:bg-slate-800">
                💬
              </span>
              <span className="font-medium">Open support chat</span>
            </button>

            <button
              type="button"
              className="inline-flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[10px] text-slate-700 hover:bg-slate-100/10 dark:text-slate-200 dark:hover:bg-slate-900/80"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] dark:bg-slate-800">
                📚
              </span>
              <span className="font-medium">Documentation &amp; guides</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop static sidebar spacer so main content doesn't jump when present */}
      <div className="hidden md:block md:w-56" aria-hidden="true" />
    </>
  );
}
