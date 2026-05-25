'use client';

import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { get } from '@/lib/api-client';
import { DataTable } from '@/components/data-table/data-table';
import type { User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatInTimezone } from '@/lib/timezone';

interface UsersListResponse {
  data: User[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const columns: ColumnDef<User, unknown>[] = [
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'fullName',
    header: 'Họ tên',
    cell: ({ row }) => row.original.fullName ?? '—',
  },
  {
    accessorKey: 'role',
    header: 'Vai trò',
    cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
  },
  {
    accessorKey: 'lockedAt',
    header: 'Trạng thái',
    cell: ({ row }) =>
      row.original.lockedAt ? (
        <Badge variant="destructive">Đã khóa</Badge>
      ) : (
        <Badge variant="outline">Hoạt động</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) =>
      formatInTimezone(
        row.original.createdAt,
        'Asia/Ho_Chi_Minh',
        'dd/MM/yyyy'
      ),
  },
];

export default function UsersPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => get<UsersListResponse>('/users'),
  });

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Không thể tải danh sách nhân viên.{' '}
        {error instanceof Error ? error.message : ''}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý nhân viên</h1>
        <p className="text-sm text-muted-foreground">
          Tài khoản staff (SUPER_ADMIN)
        </p>
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="email"
        searchPlaceholder="Tìm theo email..."
      />
    </div>
  );
}
