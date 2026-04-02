import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="lg:hidden">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-col transition-all duration-200',
          collapsed ? 'lg:ml-16' : 'lg:ml-60',
        )}
      >
        <Header onMenuClick={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
