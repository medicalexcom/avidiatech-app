import type { ReactNode } from 'react'
import Sidebar from '../../components/Sidebar'
import TopNav from '../../components/TopNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1">
  <<Sidebar /> />
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
