'use client';

import { useState } from 'react';
import { AuthProvider, type AuthUser } from '@/providers/auth-provider';
import { TaskNotificationsListener } from '@/components/tasks/TaskNotificationsListener';
import { PropertySelectionProvider } from '@/providers/property-selection-provider';
import { Sidebar, NAV_ITEMS } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/rbac';
import { HydrationGuard } from '@/components/hydration-guard';

interface DashboardShellProps {
  children: React.ReactNode;
  initialUser: AuthUser;
}

export function DashboardShell({ children, initialUser }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(initialUser.role, item.permission)
  );

  return (
    <AuthProvider initialUser={initialUser}>
      <TaskNotificationsListener />
      <PropertySelectionProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>

          {/* Mobile sidebar (Sheet) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-14 items-center border-b px-4">
                <span className="text-lg font-semibold">Hotel Admin</span>
              </div>
              <nav className="space-y-1 p-2">
                {filteredItems.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Main content area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMobileMenuToggle={() => setMobileMenuOpen(true)} />
            <main className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6">
              <HydrationGuard>{children}</HydrationGuard>
            </main>
          </div>
        </div>
      </PropertySelectionProvider>
    </AuthProvider>
  );
}
