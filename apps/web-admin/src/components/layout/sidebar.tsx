'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  CalendarCheck,
  CreditCard,
  Star,
  MessageSquare,
  BarChart3,
  Users,
  ScrollText,
  PanelLeftClose,
  PanelLeft,
  ClipboardList,
  Receipt,
  UserSquare2,
  Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import type { Permission } from '@/lib/rbac';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Properties', href: '/properties', icon: Building2, permission: 'properties:read' },
  { label: 'Room Board', href: '/room-board', icon: BedDouble, permission: 'rooms:status' },
  { label: 'Bảng giá DV', href: '/service-catalog', icon: Tags, permission: 'properties:read' },
  { label: 'Bookings', href: '/bookings', icon: CalendarCheck, permission: 'bookings:read' },
  { label: 'Tasks', href: '/tasks', icon: ClipboardList, permission: 'tasks:read' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoices:read' },
  { label: 'Payments', href: '/payments', icon: CreditCard, permission: 'payments:read' },
  { label: 'Guests', href: '/guests', icon: UserSquare2, permission: 'guests:read' },
  { label: 'Reviews', href: '/reviews', icon: Star, permission: 'reviews:read' },
  { label: 'Chat', href: '/chat', icon: MessageSquare, permission: 'chat:read' },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:read' },
  { label: 'Users', href: '/users', icon: Users, permission: 'users:read' },
  { label: 'Audit Log', href: '/audit-log', icon: ScrollText, permission: 'audit:read' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { can } = usePermissions();

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        {!collapsed && (
          <span className="text-lg font-semibold">Hotel Admin</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {filteredItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export { NAV_ITEMS };
