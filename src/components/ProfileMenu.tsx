"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser, SignOutButton } from "@clerk/nextjs";

/**
 * ProfileMenu — consistent premium dropdown.
 * - Each menu item uses identical spacing & styles.
 * - "Subscription & Billing" is a normal item, same as Account Settings.
 * - Robust nav via window.history/window.location.fallback.
 */

export default function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const isDark = saved === "dark";
    setDark(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && menuRef.current && buttonRef.current) {
        if (!menuRef.current.contains(e.target as Node) && !buttonRef.current.contains(e.target as Node)) {
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
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
    } catch {}
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

  if (!isLoaded) return null;

  const avatar = (user as any)?.imageUrl ?? "/default-avatar.png";
  const name = user?.fullName ?? user?.firstName ?? "Account";
  const email =
    (user as any)?.primaryEmailAddress?.emailAddress ??
    (user as any)?.emailAddresses?.[0]?.emailAddress ??
    "";

  const role = (user as any)?.publicMetadata?.role ?? "member";
  const orgName = (user as any)?.publicMetadata?.orgName ?? "";

  // Single menu item render to ensure consistent spacing
  const Item = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      onClick={(e) => nav(href, e)}
      className="block px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
    >
      {children}
    </a>
  );

  const menu = (
    <div
      ref={menuRef}
      className="fixed right-4 top-16 z-[9999] w-[340px] bg-white dark:bg-slate-900 border rounded-lg shadow-2xl p-3"
      role="menu"
      aria-orientation="vertical"
    >
      <div className="flex items-center gap-3 pb-3 border-b dark:border-slate-800">
        <img src={avatar} alt="avatar" className="w-12 h-12 rounded-lg object-cover" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>
          {orgName ? (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              {orgName} • {role}
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-1">{role}</div>
          )}
        </div>
      </div>

      <nav className="py-2">
        <Item href="/settings/profile">Account Settings</Item>
        <hr className="my-1 border-slate-100 dark:border-slate-800" />
        <Item href="/settings/organization">Organization</Item>
        <Item href="/settings/developer/api-keys">API Keys & Developer Tools</Item>
        <Item href="/settings/billing">Subscription &amp; Billing</Item>
      </nav>

      <div className="mt-3 border-t dark:border-slate-800 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Appearance</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Toggle theme</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input aria-label="Toggle dark mode" type="checkbox" checked={dark} onChange={toggleTheme} className="sr-only" />
            <span className={`inline-block w-10 h-6 rounded-full p-1 ${dark ? "bg-indigo-600" : "bg-slate-300"}`}>
              <span className={`block w-4 h-4 rounded-full bg-white transform ${dark ? "translate-x-4" : "translate-x-0"}`} />
            </span>
          </label>
        </div>

        <div className="mt-3">
          <SignOutButton>
            <button onClick={() => setOpen(false)} className="w-full text-left text-sm text-red-600 hover:underline">
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
        className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Account"
        type="button"
      >
        <img src={avatar} alt="avatar" className="w-8 h-8 rounded-md object-cover" />
      </button>

      {open && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
