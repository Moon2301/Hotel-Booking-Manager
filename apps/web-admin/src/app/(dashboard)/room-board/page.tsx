'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { canTransition, getValidTransitions, groupRoomsByStatus } from '@/lib/room-status';
import { Property, Room, RoomStatus } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/** Color configuration for each room status */
const STATUS_COLORS: Record<RoomStatus, { bg: string; border: string; text: string; badge: string }> = {
  [RoomStatus.AVAILABLE]: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-800',
    badge: 'bg-green-500 text-white',
  },
  [RoomStatus.RESERVED]: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
  },
  [RoomStatus.OCCUPIED]: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    badge: 'bg-red-500 text-white',
  },
  [RoomStatus.CLEANING]: {
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    text: 'text-orange-800',
    badge: 'bg-orange-500 text-white',
  },
  [RoomStatus.MAINTENANCE]: {
    bg: 'bg-gray-100',
    border: 'border-gray-500',
    text: 'text-gray-800',
    badge: 'bg-gray-500 text-white',
  },
};

/** Human-readable labels for statuses */
const STATUS_LABELS: Record<RoomStatus, string> = {
  [RoomStatus.AVAILABLE]: 'Available',
  [RoomStatus.RESERVED]: 'Reserved',
  [RoomStatus.OCCUPIED]: 'Occupied',
  [RoomStatus.CLEANING]: 'Cleaning',
  [RoomStatus.MAINTENANCE]: 'Maintenance',
};

export default function RoomBoardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch properties for the selector dropdown
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => get<Property[]>('/properties'),
  });

  // Fetch rooms for the selected property
  const {
    data: rooms,
    isLoading: roomsLoading,
    isError: roomsError,
  } = useQuery({
    queryKey: ['rooms', selectedPropertyId],
    queryFn: () => get<Room[]>(`/properties/${selectedPropertyId}/rooms`),
    enabled: !!selectedPropertyId,
  });

  // Mutation for updating room status
  const statusMutation = useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: RoomStatus }) =>
      patch<Room>(`/properties/${selectedPropertyId}/rooms/${roomId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', selectedPropertyId] });
    },
    onError: () => {
      // Error toast is handled by the axios interceptor in api-client.ts
    },
  });

  const handleStatusChange = (room: Room, newStatus: RoomStatus) => {
    if (!canTransition(room.status, newStatus)) {
      const validTargets = getValidTransitions(room.status)
        .map((s) => STATUS_LABELS[s])
        .join(', ');
      toast({
        variant: 'destructive',
        title: 'Invalid transition',
        description: `Cannot change from ${STATUS_LABELS[room.status]} to ${STATUS_LABELS[newStatus]}. Valid transitions: ${validTargets}`,
      });
      return;
    }

    statusMutation.mutate({ roomId: room.id, status: newStatus });
  };

  const groupedRooms = rooms ? groupRoomsByStatus(rooms) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Room Status Board</h1>
      </div>

      {/* Property Selector */}
      <div className="w-full max-w-sm">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {propertiesLoading ? (
              <SelectItem value="loading" disabled>
                Loading...
              </SelectItem>
            ) : (
              properties?.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Room Board Content */}
      {!selectedPropertyId && (
        <p className="text-muted-foreground">Select a property to view room statuses.</p>
      )}

      {selectedPropertyId && roomsLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      )}

      {selectedPropertyId && roomsError && (
        <p className="text-destructive">Failed to load rooms. Please try again.</p>
      )}

      {groupedRooms && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(Object.keys(STATUS_LABELS) as RoomStatus[]).map((status) => (
            <StatusColumn
              key={status}
              status={status}
              rooms={groupedRooms[status]}
              onStatusChange={handleStatusChange}
              isMutating={statusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatusColumnProps {
  status: RoomStatus;
  rooms: Room[];
  onStatusChange: (room: Room, newStatus: RoomStatus) => void;
  isMutating: boolean;
}

function StatusColumn({ status, rooms, onStatusChange, isMutating }: StatusColumnProps) {
  const colors = STATUS_COLORS[status];

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className={`rounded-lg border-l-4 ${colors.border} ${colors.bg} p-3`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-semibold ${colors.text}`}>
            {STATUS_LABELS[status]}
          </h2>
          <Badge className={colors.badge}>{rooms.length}</Badge>
        </div>
      </div>

      {/* Room Cards */}
      <div className="space-y-2">
        {rooms.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No rooms</p>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onStatusChange={onStatusChange}
              isMutating={isMutating}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  onStatusChange: (room: Room, newStatus: RoomStatus) => void;
  isMutating: boolean;
}

function RoomCard({ room, onStatusChange, isMutating }: RoomCardProps) {
  const validTransitions = getValidTransitions(room.status);

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">
          Room {room.roomNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {room.roomType?.name && <p>{room.roomType.name}</p>}
            {room.floor != null && <p>Floor {room.floor}</p>}
          </div>

          {/* Transition Buttons */}
          {validTransitions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {validTransitions.map((targetStatus) => (
                <Button
                  key={targetStatus}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={isMutating}
                  onClick={() => onStatusChange(room, targetStatus)}
                >
                  → {STATUS_LABELS[targetStatus]}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
