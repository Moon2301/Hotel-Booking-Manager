'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useProperty } from '@/hooks/queries/use-properties';

export default function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const propertyId = params.id;
  const { data: property, isLoading } = useProperty(propertyId);

  const tabs = [
    { name: 'Overview', href: `/properties/${propertyId}` },
    { name: 'Loại phòng', href: `/properties/${propertyId}/room-types` },
    { name: 'Phòng', href: `/properties/${propertyId}/rooms` },
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {property?.name || 'Chi tiết khách sạn'}
        </h1>
        <p className="text-muted-foreground text-sm">
          Quản lý thông tin, hình ảnh và danh sách phòng.
        </p>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-2">{children}</div>
    </div>
  );
}
