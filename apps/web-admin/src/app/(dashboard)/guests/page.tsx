'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { useGuests } from '@/hooks/queries/use-guests';
import { formatInTimezone } from '@/lib/timezone';
import type { Guest } from '@/types';

const columns: ColumnDef<Guest, unknown>[] = [
  {
    accessorKey: 'fullName',
    header: 'Họ tên',
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email || '—',
  },
  {
    accessorKey: 'phone',
    header: 'Số điện thoại',
  },
  {
    accessorKey: 'cccdHash',
    header: 'Xác thực CCCD',
    cell: ({ row }) => row.original.cccdHash ? '✅ Đã xác thực' : '—',
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tham gia',
    cell: ({ row }) =>
      formatInTimezone(row.original.createdAt, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
  },
];

export default function GuestsPage() {
  const { data, isLoading, isError, error } = useGuests();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive text-sm">
          Không thể tải danh sách khách hàng. {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Danh sách Khách hàng</h1>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="fullName"
        searchPlaceholder="Tìm theo tên khách hàng..."
      />
    </div>
  );
}
