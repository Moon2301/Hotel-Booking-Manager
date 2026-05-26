'use client';

import { useState } from 'react';
import { usePropertySelection } from '@/providers/property-selection-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { canTransition, getValidTransitions, groupRoomsByStatus } from '@/lib/room-status';
import { Property, Room, RoomStatus } from '@/types';
import {
  checkOutBooking,
  getRoomFolio,
  listServiceItems,
  postCharge,
} from '@/lib/api/folio';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const { selectedPropertyId, setSelectedPropertyId } = usePropertySelection();
  const queryClient = useQueryClient();
  const [folioRoom, setFolioRoom] = useState<Room | null>(null);
  const folioOpen = !!folioRoom;

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
              onOpenFolio={(room) => setFolioRoom(room)}
              isMutating={statusMutation.isPending}
            />
          ))}
        </div>
      )}

      {selectedPropertyId && folioRoom && (
        <RoomFolioDialog
          open={folioOpen}
          onOpenChange={(v) => !v && setFolioRoom(null)}
          propertyId={selectedPropertyId}
          room={folioRoom}
        />
      )}
    </div>
  );
}

interface StatusColumnProps {
  status: RoomStatus;
  rooms: Room[];
  onStatusChange: (room: Room, newStatus: RoomStatus) => void;
  onOpenFolio: (room: Room) => void;
  isMutating: boolean;
}

function StatusColumn({
  status,
  rooms,
  onStatusChange,
  onOpenFolio,
  isMutating,
}: StatusColumnProps) {
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
              onOpenFolio={onOpenFolio}
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
  onOpenFolio: (room: Room) => void;
  isMutating: boolean;
}

function RoomCard({ room, onStatusChange, onOpenFolio, isMutating }: RoomCardProps) {
  const validTransitions = getValidTransitions(room.status);

  return (
    <Card
      className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onOpenFolio(room)}
      role="button"
      tabIndex={0}
    >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(room, targetStatus);
                  }}
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

function moneyVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function RoomFolioDialog({
  open,
  onOpenChange,
  propertyId,
  room,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  room: Room;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['room-folio', propertyId, room.id],
    queryFn: () => getRoomFolio(propertyId, room.id),
    enabled: open,
  });

  const { data: serviceItems } = useQuery({
    queryKey: ['service-items', propertyId],
    queryFn: () => listServiceItems(propertyId),
    enabled: open,
  });

  const [serviceItemId, setServiceItemId] = useState('');
  const [qty, setQty] = useState(1);

  const postChargeMutation = useMutation({
    mutationFn: () => {
      if (!data?.booking?.id) throw new Error('No active stay');
      if (!serviceItemId) throw new Error('Choose service');
      return postCharge(data.booking.id, { serviceItemId, quantity: qty });
    },
    onSuccess: async () => {
      toast({ title: 'Đã ghi nhận phát sinh' });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
      setQty(1);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Không thêm được phát sinh',
        description: err?.message || 'Vui lòng thử lại',
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => {
      if (!data?.booking?.id) throw new Error('No active stay');
      return checkOutBooking(data.booking.id);
    },
    onSuccess: async () => {
      toast({ title: 'Đã check-out và tạo hoá đơn FINAL' });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const booking = data?.booking;
  const totals = data?.totals;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Phòng {room.roomNumber} · Khách & phát sinh</DialogTitle>
          <DialogDescription>
            Nhân viên có thể xem ai đang ở, đã dùng gì và tổng tiền hiện tại.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : !booking ? (
          <p className="text-sm text-muted-foreground">
            Phòng hiện không có khách đang ở (không có booking CHECKED_IN).
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Booking</div>
                <div className="font-mono text-sm">{booking.id.slice(0, 8)}…</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {booking.checkIn} → {booking.checkOut}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Khách</div>
                <div className="text-sm font-semibold">{booking.guest?.fullName || '—'}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {booking.guest?.phone || booking.guest?.email}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Tổng tạm tính</div>
                <div className="text-lg font-extrabold text-emerald-700">
                  {moneyVnd(totals?.grandTotal ?? 0)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Tiền phòng: {moneyVnd(totals?.roomTotal ?? 0)} · Phát sinh:{' '}
                  {moneyVnd(totals?.chargesTotal ?? 0)}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-sm font-semibold">Người đang ở</div>
              <div className="mt-2 space-y-1 text-sm">
                {(data.occupants?.length ? data.occupants : booking.occupants || []).map(
                  (o: any) => (
                    <div key={o.id} className="flex items-center justify-between gap-3">
                      <span>
                        {o.fullName}{' '}
                        {o.isPrimary ? (
                          <span className="text-xs text-primary">· chính</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">{o.idDocumentType}</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Phát sinh dịch vụ</div>
                  <div className="text-xs text-muted-foreground">
                    Chỉ nhân viên ghi nhận. Các phát sinh sẽ được cộng vào hoá đơn FINAL lúc check-out.
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-[240px]">
                    <Label>Dịch vụ</Label>
                    <Select value={serviceItemId} onValueChange={setServiceItemId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Chọn dịch vụ" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceItems?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {moneyVnd(Number(s.unitPrice))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[110px]">
                    <Label>Số lượng</Label>
                    <Input
                      className="h-9"
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                    />
                  </div>
                  <Button
                    className="h-9"
                    disabled={postChargeMutation.isPending || !serviceItemId}
                    onClick={() => postChargeMutation.mutate()}
                  >
                    Thêm
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {data.charges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có phát sinh.</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    {data.charges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate">
                            {c.description || 'Phát sinh'}
                            {c.status === 'VOID' ? (
                              <span className="ml-2 text-xs text-rose-600">· VOID</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.quantity} × {moneyVnd(Number(c.unitPrice))}
                          </div>
                        </div>
                        <div className="font-semibold">{moneyVnd(Number(c.amount))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-sm font-semibold">Hoá đơn</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>DEPOSIT</span>
                  <span className="font-mono text-xs">
                    {data.depositInvoice ? data.depositInvoice.id.slice(0, 8) + '…' : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>FINAL</span>
                  <span className="font-mono text-xs">
                    {data.finalInvoice ? data.finalInvoice.id.slice(0, 8) + '…' : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            variant="destructive"
            disabled={checkOutMutation.isPending || !data?.booking?.id || !!data?.finalInvoice}
            onClick={() => checkOutMutation.mutate()}
          >
            {data?.finalInvoice ? 'FINAL đã tạo' : 'Check-out & tạo FINAL'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
