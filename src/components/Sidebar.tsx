'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Define sections with titles and their respective items
const sections = [
  {
    title: 'AI Extraction & Content',
    items: [
      { name: 'Extract', href: '/dashboard/extract' },
      { name: 'Describe', href: '/dashboard/describe' },
      { name: 'SEO', href: '/dashboard/seo' },
      { name: 'Translate', href: '/dashboard/translate' },
      { name: 'Cluster', href: '/dashboard/cluster' },
      { name: 'Studio', href: '/dashboard/studio' },
    ],
  },
  {
    title: 'Data Intelligence',
    items: [
      { name: 'Match', href: '/dashboard/match' },
      { name: 'Variants', href: '/dashboard/variants' },
      { name: 'Specs', href: '/dashboard/specs' },
      { name: 'Docs', href: '/dashboard/docs' },
      { name: 'Images', href: '/dashboard/images' },
    ],
  },
  {
    title: 'Commerce & Automation',
    items: [
      { name: 'Import', href: '/dashboard/import' },
      { name: 'Audit', href: '/dashboard/audit' },
      { name: 'Price', href: '/dashboard/price' },
      { name: 'Feeds', href: '/dashboard/feeds' },
      { name: 'Monitor', href: '/dashboard/monitor' },
    ],
  },
  {
    title: 'Developer Tools',
    items: [
      { name: 'Browser', href: '/dashboard/browser' },
      { name: 'API', href: '/dashboard/api' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="p-4 space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.title}>
          {sectionIndex > 0 && (
            <hr className="my-4 border-gray-700/30 dark:border-gray-200/20" />
          )}
          <h2 className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            {section.title}
          </h2>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      active
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700/40'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
