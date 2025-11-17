"use client";
'use client';

import Link from 'next/link';

export default function TopNav() {
  return (
    <header className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
      <div className="text-xl font-bold">AvidiaTech Dashboard</div>
      <nav className="flex space-x-6 items-center">
        {/* Platform tools */}
        <div className="flex space-x-4">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/analytics">Analytics</Link>
          <Link href="/dashboard/visualize">Visualize</Link>
          <Link href="/dashboard/bulk">Bulk Ops</Link>
          <Link href="/dashboard/validate">Validate</Link>
          <Link href="/dashboard/description-formats">Descriptions</Link>
        </div>
        {/* Organization & Admin */}
        <div className="flex space-x-4 border-l border-gray-600 pl-4">
          <Link href="/dashboard/organization">Organization</Link>
          <Link href="/dashboard/roles">Roles</Link>
          <Link href="/dashboard/subscription">Subscription</Link>
          <Link href="/dashboard/api-keys">API Keys</Link>
          <Link href="/dashboard/versioning">Versioning</Link>
        </div>
        {/* Notifications & Profile */}
        <div className="flex space-x-4 border-l border-gray-600 pl-4">
          <Link href="/dashboard/notifications">Notifications</Link>
          <Link href="#">Profile</Link>
        </div>
      </nav>
    </header>
  );
}
