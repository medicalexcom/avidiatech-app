'use client';



import Link from 'next/link';
import { usePathname } from 'next/navigation';

coconst links = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Extract', href: '/dashboard/extract' },
  { name: 'Describe', href: '/dashboard/describe' },
  { name: 'Match', href: '/dashboard/match' },
  { name: 'Validate', href: '/dashboard/validate' },
  { name: 'Visualize', href: '/dashboard/visualize' },
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
