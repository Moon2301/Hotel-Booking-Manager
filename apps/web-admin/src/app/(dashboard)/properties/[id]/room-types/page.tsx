'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import type { RoomType } from '@/types';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRoomTypes } from '@/hooks/use-room-types';
import { RoomTypeCreateDialog } from './room-type-create-dialog';

/**
 * Format a number as VND currency.
 */
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

const columns: ColumnDef<RoomType, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'basePrice',
    header: 'Base Price',
    cell: ({ row }) => formatVND(row.original.basePrice),
  },
  {
    accessorKey: 'maxOccupancy',
    header: 'Max Occupancy',
  },
  {
    accessorKey: 'amenities',
    header: 'Amenities',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.amenities.map((amenity) => (
          <Badge key={amenity} variant="secondary">
            {amenity}
          </Badge>
        ))}
      </div>
    ),
  },
];

export default function RoomTypesPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: roomTypes = [], isLoading } = useRoomTypes(propertyId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Room Types</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room Type
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={roomTypes}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search room types..."
      />

      <RoomTypeCreateDialog
        propertyId={propertyId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
