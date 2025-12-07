"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";

/**
 * ProfileMenu — premium dropdown with global light/dark toggle.
 * - Uses next-themes (ThemeProvider) with light as default.
 * - Menu styling matches the premium dashboard look.
 * - Robust nav via window.history/window.location fallback.
 */

export default function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Avoid hydration issues with next-themes
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click / ESC
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && menuRef.current && buttonRef.current) {
        if (
          !menuRef.current.contains(e.target as Node) &&
          !buttonRef.current.contains(e.target as Node)
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

  // Reliable theme detection helper: prefer next-themes' resolvedTheme,
  // fall back to checking html.dark class (in case class strategy is used).
  function getCurrentTheme(): "dark" | "light" {
    if (resolvedTheme === "dark" || resolvedTheme === "light") {
      return resolvedTheme;
    }
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "light";
  }

  // Compute isDark from the reliable getter. Use mounted guard to avoid SSR mismatch.
  const isDark = mounted ? getCurrentTheme() === "dark" : false;

  // Toggle theme reading the current theme at click time (avoids stale closures).
  function toggleTheme() {
    const current = getCurrentTheme();
    setTheme(current === "dark" ? "light" : "dark");
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
      // try pushState (SPA-friendly), then ensure navigation
      window.history.pushState({}, "", href);
      window.location.href = href;
    } catch {
      window.location.href = href;
    }
  }

  if (!isLoaded || !mounted) return null;

  const avatar = (user as any)?.imageUrl ?? "/default-avatar.png";
  const name = user?.fullName ?? user?.firstName ?? "Account";
  const email =
    (user as any)?.primaryEmailAddress?.emailAddress ??
    (user as any)?.emailAddresses?.[0]?.emailAddress ??
    "";

  const role = (user as any)?.publicMetadata?.role ?? "member";
  const orgName = (user as any)?.publicMetadata?.orgName ?? "";

  // Single menu item render to ensure consistent spacing
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
      className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
    >
      {children}
    </a>
  );

  const menu = (
    <div
      ref={menuRef}
      className="fixed right-3 top-14 z-[9999] w-[340px] rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
      role="menu"
      aria-orientation="vertical"
    >
      {/* Header / identity */}
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-3 py-3 ring-1 ring-slate-100 dark:bg-slate-900/80 dark:ring-slate-800">
        <img
          src={avatar}
          alt="avatar"
          className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {name}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {email}
          </div>
          {orgName ? (
            <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
              {orgName} • {role}
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {role}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-3 space-y-1 rounded-2xl bg-slate-50/70 p-2 ring-1 ring-slate-100 dark:bg-slate-900/80 dark:ring-slate-800">
        <Item href="/settings/profile">Account Settings</Item>
        <hr className="my-1 border-slate-100 dark:border-slate-800" />
        <Item href="/settings/organization">Organization</Item>
        <Item href="/settings/developer/api-keys">
          API Keys &amp; Developer Tools
        </Item>
        <Item href="/settings/billing">Subscription &amp; Billing</Item>
      </nav>

      {/* Footer: appearance + sign out */}
      <div className="mt-3 space-y-3 rounded-2xl bg-slate-50/60 p-3 ring-1 ring-slate-100 dark:bg-slate-900/80 dark:ring-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Appearance
            </div>
          </div>

          {/* Premium toggle pill */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            aria-pressed={isDark}
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
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <SignOutButton>
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1.5 text-xs shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800"
        title="Account"
        type="button"
      >
        <img
          src={avatar}
          alt="avatar"
          className="h-8 w-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
