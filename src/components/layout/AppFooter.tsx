import React from "react";

type AppFooterProps = {
  version?: string;
};

const footerLinks = [
  { label: "Docs",    href: "/docs" },
  { label: "API",     href: "/docs/api" },
  { label: "Status",  href: "/status" },
  { label: "Support", href: "/dashboard/support" },
  { label: "Terms",   href: "/legal/terms",   external: true },
  { label: "Privacy", href: "/legal/privacy", external: true },
];

export default function AppFooter({ version }: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/60 bg-white/85 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/90">
      <div className="mx-auto flex h-11 max-w-screen-2xl items-center justify-between px-5 lg:px-6">

        {/* Left: copyright + version */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            AvidiaTech
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>© {year}</span>
          {version && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                v{version}
              </span>
            </>
          )}
        </div>

        {/* Right: nav links */}
        <nav className="flex items-center gap-4" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="text-[11px] text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
