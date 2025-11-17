'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar navigation for the dashboard.
 *
 * This component renders a vertical list of links corresponding to the
 * core product modules offered by AvidiaTech.  The active link is
 * highlighted based on the current path.
 */

const links = [
  // AI Extraction & Content
  { name: 'Extract', href: '/dashboard/extract' },
  { name: 'Describe', href: '/dashboard/describe' },
  { name: 'SEO', href: '/dashboard/seo' },
  { name: 'Translate', href: '/dashboard/translate' },
  { name: 'Cluster', href: '/dashboard/cluster' },
  { name: 'Studio', href: '/dashboard/studio' },
  // Data Intelligence
  { name: 'Match', href: '/dashboard/match' },
  { name: 'Variants', href: '/dashboard/variants' },
  { name: 'Specs', href: '/dashboard/specs' },
  { name: 'Docs', href: '/dashboard/docs' },
  { name: 'Images', href: '/dashboard/images' },
  // Commerce & Automation
  { name: 'Import', href: '/dashboard/import' },
  { name: 'Audit', href: '/dashboard/audit' },
  { name: 'Price', href: '/dashboard/price' },
  { name: 'Feeds', href: '/dashboard/feeds' },
  { name: 'Monitor', href: '/dashboard/monitor' },
  // Developer Tools
  { name: 'Browser', href: '/dashboard/browser' },
  { name: 'API', href: '/dashboard/api' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-4">
      <div className="text-2xl font-bold mb-6">AvidiaTech</div>
      <nav className="flex flex-col space-y-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block py-2 px-3 rounded-lg ${
                active ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
