"use client";

import React, { useEffect, useState } from "react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import ProfileMenu from "./ProfileMenu";

type HeaderProps = {
  children: React.ReactNode;
};

export default function Header({ children }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Original header from first snippet */}
      <header className="w-full border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="font-bold">
              AvidiaTech
            </a>
          </div>

          <div className="flex items-center gap-3">
            {/* other header buttons */}
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Top navigation from second snippet */}
      <TopNav onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar from second snippet */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area from second snippet */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
