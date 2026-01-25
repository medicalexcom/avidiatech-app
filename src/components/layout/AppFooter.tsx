import React from "react";

type AppFooterProps = {
  version?: string;
};

export default function AppFooter({ version }: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-6 text-xs text-slate-500">
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
            className="hover:text-slate-300 hover:underline"
          >
            Docs
          </a>
          <a
            href="/api"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 hover:underline"
          >
            API
          </a>
          <a
            href="https://status.avidiatech.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 hover:underline"
          >
            Status
          </a>
          <a
            href="mailto:support@avidiatech.com"
            className="hover:text-slate-300 hover:underline"
          >
            Support
          </a>
          <a
            href="/legal/terms"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 hover:underline"
          >
            Terms
          </a>
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 hover:underline"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
