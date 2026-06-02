'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useProperties } from '@/hooks/queries/use-properties';
import { NAV_ITEMS } from '@/components/layout/sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const QUICK_HINTS: Record<string, string> = {
  '/properties': 'Danh sách cơ sở, múi giờ và cấu hình',
  '/room-board': 'Trạng thái phòng theo thời gian thực',
  '/bookings': 'Pipeline HOLD → CHECK-OUT',
  '/invoices': 'Hóa đơn và trạng thái thanh toán',
  '/guests': 'Hồ sơ khách lưu trú',
  '/reviews': 'Kiểm duyệt đánh giá',
  '/rates': 'Giá phòng',
  '/reports': 'Occupancy, ADR và xuất báo cáo',
};

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function StatCard({
  title,
  value,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  description: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardHome() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get('error') === 'unauthorized';

  const canReadProperties = can('properties:read');
  const { data: properties, isLoading: propertiesLoading } = useProperties({
    enabled: canReadProperties,
  });

  const quickLinks = NAV_ITEMS.filter(
    (item) =>
      item.href !== '/' && (!item.permission || can(item.permission))
  );

  const propertyCount = properties?.length ?? 0;

  return (
    <div className="space-y-8">
      {unauthorized && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Bạn không có quyền truy cập trang vừa chọn. Dùng menu bên trái để
            điều hướng các module được phép.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Bảng điều khiển
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Xin chào{user?.fullName ? `, ${user.fullName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.email}
            {user?.role && (
              <>
                {' '}
                · <span className="text-foreground">{formatRole(user.role)}</span>
              </>
            )}
          </p>
        </div>
        {can('properties:read') && (
          <Button asChild>
            <Link href="/properties">
              <Building2 className="mr-2 h-4 w-4" />
              Quản lý Property
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cơ sở (Property)"
          value={canReadProperties ? propertyCount : '—'}
          description={
            canReadProperties
              ? 'Tổng property trong hệ thống'
              : 'Không có quyền xem property'
          }
          loading={propertiesLoading && canReadProperties}
        />
        <StatCard
          title="Booking hôm nay"
          value="—"
          description="Thống kê chi tiết sẽ bổ sung"
        />
        <StatCard
          title="Phòng cần dọn"
          value="—"
          description="Liên kết Room Board"
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Truy cập nhanh</h2>
            <p className="text-sm text-muted-foreground">
              {quickLinks.length} module theo quyền tài khoản của bạn
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="group block">
              <Card
                className={cn(
                  'h-full transition-colors hover:border-primary/40 hover:bg-accent/30'
                )}
              >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.label}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {QUICK_HINTS[item.href] ?? 'Mở module'}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {quickLinks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Tài khoản chưa được gán quyền module nào. Liên hệ quản trị viên.
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Gợi ý vận hành</CardTitle>
          <CardDescription>
            Luồng làm việc phổ biến cho đội front desk
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {can('properties:read') && (
            <Link
              href="/properties"
              className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              1. Chọn property
            </Link>
          )}
          {can('rooms:status') && (
            <Link
              href="/room-board"
              className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              2. Cập nhật Room Board
            </Link>
          )}
          {can('bookings:read') && (
            <Link
              href="/bookings"
              className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              3. Xử lý booking
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
