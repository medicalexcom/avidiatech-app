"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser, SignOutButton } from "@clerk/nextjs";

/**
 * Premium Profile Menu (portal)
 * - Uses anchors + window.location.href fallback for rock-solid navigation
 * - Shows avatar, name, email, org & role, quick links, billing portal button
 * - Dark mode toggle persisted to localStorage
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
        // allow new-tab
        setOpen(false);
        return;
      }
      e.preventDefault();
    }
    setOpen(false);
    // prefer SPA but fallback to full navigation
    try {
      // try history API (if app has client router integrated)
      window.history.pushState({}, "", href);
      // trigger manual navigation if needed
      window.location.href = href;
    } catch {
      window.location.href = href;
    }
  }

  async function openBillingPortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.url) {
        window.open(json.url, "_blank");
      } else {
        alert(json?.message || json?.error || "Billing portal unavailable.");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to open billing portal");
    } finally {
      setLoadingPortal(false);
      setOpen(false);
    }
  }

  if (!isLoaded) return null;

  const avatar = (user as any)?.imageUrl ?? "/default-avatar.png";
  const name = user?.fullName ?? user?.firstName ?? "Account";
  const email =
    (user as any)?.primaryEmailAddress?.emailAddress ??
    (user as any)?.emailAddresses?.[0]?.emailAddress ??
    "";

  // read role from Clerk public metadata if present
  const role = (user as any)?.publicMetadata?.role ?? (user as any)?.unsafeMetadata?.role ?? "user";
  const orgName = (user as any)?.publicMetadata?.orgName ?? "";

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
          {orgName ? <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{orgName} • {role}</div> : <div className="text-xs text-slate-400 mt-1">{role}</div>}
        </div>
      </div>

      <nav className="py-2 space-y-1">
        <a href="/settings/profile" onClick={(e) => nav("/settings/profile", e)} className="block px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
          Account Settings
        </a>
        <a href="/settings/organization" onClick={(e) => nav("/settings/organization", e)} className="block px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
          Organization
        </a>
        <a href="/settings/developer/api-keys" onClick={(e) => nav("/settings/developer/api-keys", e)} className="block px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
          API Keys & Developer Tools
        </a>

        <div className="mt-2 px-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              openBillingPortal();
            }}
            className="w-full inline-flex justify-center items-center gap-2 rounded-md px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
            aria-busy={loadingPortal}
          >
            {loadingPortal ? "Opening portal…" : "Manage Subscription & Billing"}
          </button>
        </div>
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
