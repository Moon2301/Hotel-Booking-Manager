'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';

import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/queries/use-properties';
import { formatInTimezone } from '@/lib/timezone';
import type { Property } from '@/types';

const columns: ColumnDef<Property, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Tên',
  },
  {
    accessorKey: 'address',
    header: 'Địa chỉ',
    cell: ({ row }) => row.original.address ?? '—',
  },
  {
    accessorKey: 'ianaTimezone',
    header: 'Múi giờ',
  },
  {
    id: 'roomCount',
    header: 'Số phòng',
    cell: () => '—',
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) =>
      formatInTimezone(
        row.original.createdAt,
        row.original.ianaTimezone,
        'dd/MM/yyyy'
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/properties/${row.original.id}`}>
          <Settings className="mr-2 h-4 w-4" />
          Quản lý
        </Link>
      </Button>
    ),
  },
];

export default function PropertiesPage() {
  const { data: properties, isLoading, isError, error } = useProperties();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive text-sm">
          Không thể tải danh sách property.{' '}
          {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <Button disabled title="Form tạo property sẽ bổ sung sau">
          <Plus className="mr-2 h-4 w-4" />
          Tạo Property
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={properties ?? []}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Tìm theo tên..."
      />
    </div>
  );
}
