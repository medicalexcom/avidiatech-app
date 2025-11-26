"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * ProfileMenu (portal)
 * - Renders dropdown into document.body to avoid clipping by parent containers
 * - Items: Account, Organization, Developer API Keys, Billing (navigates to billing settings)
 * - Theme toggle (localStorage)
 * - Sign out via Clerk SignOutButton (with fallback)
 *
 * Tailwind classes used as example — adapt to your design system.
 */

export default function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
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

  // close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // theme init
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      const isDark = saved === "dark";
      setDark(isDark);
      if (isDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch (e) {
      // ignore
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
    } catch {}
  }

  // Billing portal helper (kept as optional helper)
  async function openBillingPortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank");
      } else {
        // show user friendly message
        alert(data?.message || data?.error || "No billing customer found. Create a subscription first.");
      }
    } catch (err) {
      console.error("openBillingPortal error", err);
      alert("Unable to open billing portal");
    } finally {
      setLoadingPortal(false);
      setOpen(false);
    }
  }

  // Fallback sign-out if SignOutButton not used
  async function fallbackSignOut() {
    try {
      if (clerk && typeof clerk.signOut === "function") {
        await clerk.signOut();
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Sign out failed", err);
      router.push("/");
    }
  }

  if (!isLoaded) return null;

  const avatarUrl = (user as any)?.imageUrl ?? "";
  const fullName = user?.fullName ?? user?.firstName ?? "Account";
  const email =
    (user as any)?.primaryEmailAddress?.emailAddress ??
    (user as any)?.emailAddresses?.[0]?.emailAddress ??
    "";

  function navigateTo(path: string) {
    setOpen(false);
    router.push(path);
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
          <img src={avatarUrl || "/default-avatar.png"} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          <div className="truncate">
            <div className="text-sm font-medium truncate">{fullName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>
          </div>
        </div>
      </div>

      <div className="py-1">
        <MenuItem onClick={() => navigateTo("/dashboard/settings/profile")}>Account Settings</MenuItem>

        <MenuItem onClick={() => navigateTo("/dashboard/settings/organization")}>Organization</MenuItem>

        <MenuItem onClick={() => navigateTo("/dashboard/settings/developer/api-keys")}>API Keys</MenuItem>

        <MenuItem
          onClick={() => {
            // per spec: route to billing settings page
            navigateTo("/dashboard/settings/billing");
          }}
        >
          Subscription & Billing
        </MenuItem>
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
        {/* Use Clerk's SignOutButton for a11y + server cleanup, with fallback */}
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

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
      type="button"
    >
      {children}
    </button>
  );
}
