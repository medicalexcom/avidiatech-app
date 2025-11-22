import React from "react";
import ProfileMenu from "./ProfileMenu";

export default function Header() {
  return (
    <header className="w-full border-b bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="font-bold">AvidiaTech</a>
        </div>

        <div className="flex items-center gap-3">
          {/* other header buttons */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
