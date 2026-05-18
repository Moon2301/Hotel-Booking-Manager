'use client';

import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Plus } from 'lucide-react';

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
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo Property
          </Link>
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
