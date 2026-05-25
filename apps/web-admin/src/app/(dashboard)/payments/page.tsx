'use client';

import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { get } from '@/lib/api-client';
import { DataTable } from '@/components/data-table/data-table';
import type { PaymentTransaction } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatInTimezone } from '@/lib/timezone';

const columns: ColumnDef<PaymentTransaction, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'Mã GD',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.id.slice(0, 8)}…</span>
    ),
  },
  {
    accessorKey: 'bookingId',
    header: 'Booking',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.bookingId.slice(0, 8)}…</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) =>
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: row.original.currency || 'VND',
      }).format(Number(row.original.amount)),
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.status}</Badge>
    ),
  },
  {
    accessorKey: 'providerRef',
    header: 'Provider ref',
    cell: ({ row }) => row.original.providerRef ?? '—',
  },
  {
    accessorKey: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) =>
      formatInTimezone(
        row.original.createdAt,
        'Asia/Ho_Chi_Minh',
        'dd/MM/yyyy HH:mm'
      ),
  },
];

export default function PaymentsPage() {
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['payments'],
    queryFn: () => get<PaymentTransaction[]>('/payments'),
  });

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Không thể tải giao dịch thanh toán.{' '}
        {error instanceof Error ? error.message : ''}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thanh toán</h1>
        <p className="text-sm text-muted-foreground">
          Lịch sử giao dịch từ payment_transactions
        </p>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchKey="providerRef"
        searchPlaceholder="Tìm theo provider ref..."
      />
    </div>
  );
}
