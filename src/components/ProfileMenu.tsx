"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";

/**
 * ProfileMenu (portal) - robust navigation using anchors to avoid portal/router issues.
 */

export default function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && menuRef.current && buttonRef.current) {
        if (!menuRef.current.contains(e.target as Node) && !buttonRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      const isDark = saved === "dark";
      setDark(isDark);
      if (isDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {}
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
    } catch {}
  }

  async function fallbackSignOut() {
    try {
      if (clerk && typeof clerk.signOut === "function") await clerk.signOut();
      else window.location.href = "/";
    } catch (err) {
      console.error("Sign out failed", err);
      window.location.href = "/";
    }
  }

  if (!isLoaded) return null;

  const avatarUrl = (user as any)?.imageUrl ?? "/default-avatar.png";
  const fullName = user?.fullName ?? user?.firstName ?? "Account";
  const email =
    (user as any)?.primaryEmailAddress?.emailAddress ??
    (user as any)?.emailAddresses?.[0]?.emailAddress ??
    "";

  function navAndClose(href: string, e?: React.MouseEvent) {
    // For safety, allow callers to pass event
    if (e) {
      // allow modifier keys to open in new tab/window
      const t = e as unknown as MouseEvent;
      if (t.metaKey || t.ctrlKey || t.shiftKey || t.button !== 0) {
        // allow default (open in new tab) and don't close
        setOpen(false);
        return;
      }
      e.preventDefault();
    }
    setOpen(false);
    // force navigation
    window.location.href = href;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed right-4 top-16 z-[9999] w-72 bg-white dark:bg-slate-900 border rounded-md shadow-lg"
      role="menu"
      aria-orientation="vertical"
    >
      <div className="p-3 border-b dark:border-slate-800">
        <div className="flex items-center gap-3">
          <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          <div className="truncate">
            <div className="text-sm font-medium truncate">{fullName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>
          </div>
        </div>
      </div>

      <div className="py-1">
        <a
          href="/settings/profile"
          onClick={(e) => navAndClose("/settings/profile", e)}
          className="w-full block text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Account Settings
        </a>

        <a
          href="/settings/organization"
          onClick={(e) => navAndClose("/settings/organization", e)}
          className="w-full block text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Organization
        </a>

        <a
          href="/settings/developer/api-keys"
          onClick={(e) => navAndClose("/settings/developer/api-keys", e)}
          className="w-full block text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          API Keys
        </a>

        <a
          href="/settings/billing"
          onClick={(e) => navAndClose("/settings/billing", e)}
          className="w-full block text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Subscription &amp; Billing
        </a>
      </div>

      <div className="border-t dark:border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Dark mode</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Toggle UI theme</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={dark} onChange={toggleTheme} className="sr-only" aria-label="Toggle dark mode" />
            <span className={`w-9 h-5 rounded-full inline-block ${dark ? "bg-indigo-600" : "bg-slate-300"}`}></span>
          </label>
        </div>
      </div>

      <div className="border-t dark:border-slate-800 px-3 py-2">
        <SignOutButton>
          <button className="w-full text-left text-sm text-red-600 hover:underline" type="button" onClick={fallbackSignOut}>
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Account"
        type="button"
      >
        <img src={avatarUrl || "/default-avatar.png"} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
      </button>

      {open && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
