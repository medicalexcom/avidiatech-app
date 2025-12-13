// src/components/ProfileMenu.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser, SignOutButton, OrganizationSwitcher } from "@clerk/nextjs";
import { useTheme } from "next-themes";

/**
 * ProfileMenu — premium account dropdown
 * - Uses next-themes + a local isDark mirror so the toggle never feels "stuck".
 * - Light mode is default (handled by global ThemeProvider).
 */

export default function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Mount flag to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync local isDark with theme, localStorage, and <html> class
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem("theme")
          : null;
      const rootHasDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");

      const ctxTheme = (resolvedTheme ?? theme) as string | undefined;

      const effectiveDark =
        saved === "dark" || ctxTheme === "dark" || rootHasDark;

      setIsDark(!!effectiveDark);
    } catch {
      setIsDark((resolvedTheme ?? theme) === "dark");
    }
  }, [mounted, theme, resolvedTheme]);

  // Close on outside click / ESC
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && menuRef.current && buttonRef.current) {
        const target = e.target as Node;
        if (
          !menuRef.current.contains(target) &&
          !buttonRef.current.contains(target)
        ) {
          setOpen(false);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleTheme() {
    if (!mounted) return;
    setIsDark((prev) => {
      const next = !prev;
      const mode = next ? "dark" : "light";

      try {
        setTheme(mode);
      } catch {
        // ignore if ThemeProvider not fully wired
      }

      try {
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem("theme", mode);
      } catch {
        /* ignore */
      }

      return next;
    });
  }

  function nav(href: string, e?: React.MouseEvent) {
    if (e) {
      const me = e as unknown as MouseEvent;
      if (me.metaKey || me.ctrlKey || me.shiftKey || me.button !== 0) {
        setOpen(false);
        return;
      }
      e.preventDefault();
    }
    setOpen(false);
    try {
      window.history.pushState({}, "", href);
      window.location.href = href;
    } catch {
      window.location.href = href;
    }
  }

  if (!isLoaded) return null;

  const avatar = (user as any)?.imageUrl ?? "/default-avatar.png";
  const name = user?.fullName ?? user?.firstName ?? "Account";
  const email =
    (user as any)?.primaryEmailAddress?.emailAddress ??
    (user as any)?.emailAddresses?.[0]?.emailAddress ??
    "";

  const role = (user as any)?.publicMetadata?.role ?? "member";
  const orgName = (user as any)?.publicMetadata?.orgName ?? "";

  const Item = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      onClick={(e) => nav(href, e)}
      className="block px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
    >
      {children}
    </a>
  );

  const menu = (
    <div
      ref={menuRef}
      className="fixed right-4 top-16 z-[9999] w-[340px] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl overflow-hidden"
      role="menu"
      aria-orientation="vertical"
    >
      {/* Accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative">
          <img
            src={avatar}
            alt="avatar"
            className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
          />
          <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-semibold text-slate-950 shadow-[0_0_0_2px_rgba(255,255,255,0.9)] dark:shadow-[0_0_0_2px_rgba(15,23,42,1)]">
            ✓
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
            {name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {email}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {orgName ? (
              <>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {orgName}
                </span>{" "}
                <span className="text-slate-400 dark:text-slate-500">•</span>{" "}
                <span className="capitalize">{role}</span>
              </>
            ) : (
              <span className="capitalize">{role}</span>
            )}
          </div>
        </div>
      </div>

      {/* Links */}
      <nav className="py-2 px-2">
        <Item href="/settings/profile">Account settings</Item>

        <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

        {/* Organization switcher: navigation mode so creation definitely works */}
        {mounted && (
          <div className="px-3 py-2">
            <OrganizationSwitcher
              hidePersonal={false}
              createOrganizationMode="navigation"
              createOrganizationUrl="/settings/organization/new"
              organizationProfileMode="navigation"
              organizationProfileUrl="/settings/organization"
              afterSelectOrganizationUrl="/dashboard/import"
              afterCreateOrganizationUrl="/dashboard/import"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full h-9 justify-between rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
                },
              }}
            />
          </div>
        )}

        <Item href="/settings/organization">Organization</Item>
        <Item href="/settings/developer/api-keys">
          API keys &amp; developer tools
        </Item>
        <Item href="/settings/billing">Subscription &amp; billing</Item>
      </nav>

      {/* Appearance + sign out */}
      <div className="mt-1 border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
              Appearance
            </div>
          </div>

          {/* ⬇️ New pill from the snippet, wired to our isDark / toggleTheme */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className={[
                "inline-flex items-center rounded-full border px-1 py-0.5 text-[11px] font-medium shadow-sm transition-colors",
                isDark
                  ? "border-slate-700 bg-slate-900 text-slate-100"
                  : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors",
                  !isDark
                    ? "bg-slate-900 text-slate-50"
                    : "text-slate-500 dark:text-slate-300",
                ].join(" ")}
              >
                <span className="text-xs">☀️</span>
                <span>Light</span>
              </span>
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors",
                  isDark
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-50 dark:text-slate-900"
                    : "text-slate-500",
                ].join(" ")}
              >
                <span className="text-xs">🌙</span>
                <span>Dark</span>
              </span>
            </button>
          )}
        </div>

        <div>
          <SignOutButton>
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-lg border border-red-100/70 dark:border-red-500/40 bg-red-50/70 dark:bg-red-500/10 px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-1.5 py-1 shadow-sm hover:bg-slate-100/90 dark:hover:bg-slate-800/90 transition-colors"
        title="Account"
        type="button"
      >
        <img
          src={avatar}
          alt="avatar"
          className="w-7 h-7 rounded-full object-cover"
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
