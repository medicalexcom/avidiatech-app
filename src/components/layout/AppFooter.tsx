import React from "react";

type AppFooterProps = {
  version?: string;
};

export default function AppFooter({ version }: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>© {year} AvidiaTech, Inc.</span>
          <span className="opacity-60">·</span>
          <span>{version ? `v${version}` : "v1"}</span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://docs.avidiatech.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            Docs
          </a>
          <a
            href="/api"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            API
          </a>
          <a
            href="https://status.avidiatech.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            Status
          </a>
          <a
            href="mailto:support@avidiatech.com"
            className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            Support
          </a>
          <a
            href="/legal/terms"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            Terms
          </a>
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
