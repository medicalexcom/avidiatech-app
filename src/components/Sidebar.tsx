'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
           {section.title}
            </h2>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg ${
                        active ? 'bg-gray-700' : 'hover:bg-gray-800'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <hr className="border-gray-700 my-4" />
          </div>
        ))}
      </nav>
    </div>
  );
}
