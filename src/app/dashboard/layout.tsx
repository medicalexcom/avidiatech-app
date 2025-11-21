'use client';

import type { ReactNode } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      <Sidebar />
      {children}
    </>
  );
}
