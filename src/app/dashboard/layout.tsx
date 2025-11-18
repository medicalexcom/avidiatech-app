import type { ReactNode } from 'react';
import Sidebar from '../../components/Sidebar';
import TopNav from '../../components/TopNav';
import LoginGate from '../../components/LoginGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LoginGate>
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-gray-50 p-6">{children}</main>
        </div>
      </div>
    </LoginGate>
  );
}
