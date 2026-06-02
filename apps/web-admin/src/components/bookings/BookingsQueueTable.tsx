'use client';

import { useMemo } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';
import { Booking, PaymentStatus, Room, RoomStatus, UserRole } from '@/types';
import { formatDateOnlyVi } from '@/lib/format-date';
import { canTransition, getValidTransitions } from '@/lib/room-status';
import { FrontDeskCheckInDialog } from '@/components/bookings/FrontDeskCheckInDialog';
import { CancelBookingDialog } from '@/components/bookings/CancelBookingDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { QrCode, RefreshCw, BedDouble } from 'lucide-react';

const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  [RoomStatus.AVAILABLE]: 'Trống',
  [RoomStatus.RESERVED]: 'Đã đặt',
  [RoomStatus.OCCUPIED]: 'Đang ở',
  [RoomStatus.CLEANING]: 'Dọn dẹp',
  [RoomStatus.MAINTENANCE]: 'Bảo trì',
};

function isPaidStale(booking: Booking): boolean {
  const updated = new Date(booking.updatedAt).getTime();
  return Date.now() - updated >= 30 * 60 * 1000;
}

export type BookingsQueueMode = 'paid' | 'pending';

interface BookingsQueueTableProps {
  propertyId: string;
  mode: BookingsQueueMode;
}

export function BookingsQueueTable({ propertyId, mode }: BookingsQueueTableProps) {
  const mounted = useMounted();
  const isPaidQueue = mode === 'paid';
  const queryKey = isPaidQueue ? 'bookings-paid' : 'bookings-pending';
  const paymentFilter = isPaidQueue ? PaymentStatus.PAID : PaymentStatus.PENDING;

  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canEditRoomStatus =
    user?.role === UserRole.SUPER_ADMIN && can('rooms:status');

  const { data: rooms } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => get<Room[]>(`/properties/${propertyId}/rooms`),
    enabled: !!propertyId,
  });

  const {
    data: bookings,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [queryKey, propertyId],
    queryFn: async () => {
      if (isPaidQueue) {
        await post<{ assigned: number; autoStaleProcessed: number }>(
          `/bookings/sync-paid?propertyId=${propertyId}`,
          {},
        );
      }
      return get<{ data: Booking[] }>(
        `/bookings?propertyId=${propertyId}&paymentStatus=${paymentFilter}&status=CONFIRMED&limit=100`,
      );
    },
    enabled: !!propertyId,
    refetchInterval: 60_000,
  });

  const roomReservationByRoomId = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings?.data?.forEach((b) => {
      if (b.roomId && b.status === 'CONFIRMED') {
        map.set(b.roomId, b);
      }
    });
    return map;
  }, [bookings]);

  const assignRoomMutation = useMutation({
    mutationFn: (bookingId: string) =>
      post<Booking>(`/bookings/${bookingId}/assign-room`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ bookingId, roomId }: { bookingId: string; roomId: string }) =>
      patch<Booking>(`/bookings/${bookingId}/room`, { roomId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
    },
  });

  const roomStatusMutation = useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: RoomStatus }) =>
      patch<Room>(`/properties/${propertyId}/rooms/${roomId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast({
        variant: 'destructive',
        title: 'Không đổi được trạng thái phòng',
        description: err.response?.data?.message || 'Chuyển trạng thái không hợp lệ',
      });
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: (bookingId: string) =>
      post(`/bookings/${bookingId}/generate-checkin-token`, {}),
    onSuccess: () => {
      toast({ title: 'Đã gửi mã check-in (email)' });
      queryClient.invalidateQueries({ queryKey: [queryKey, propertyId] });
    },
  });

  const rows = bookings?.data ?? [];
  const roomsForType = (roomTypeId: string) =>
    rooms?.filter((r) => r.roomTypeId === roomTypeId) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isPaidQueue ? (
            <>
              Booking <strong>đã thanh toán (PAID)</strong>, trạng thái CONFIRMED. Tự gán phòng
              RESERVED; PAID &gt; 30 phút được xử lý tự động.
            </>
          ) : (
            <>
              Booking <strong>chưa thanh toán (PENDING)</strong>. Có thể{' '}
              <strong>hủy phiếu thủ công</strong> hoặc chờ khách thanh toán.
            </>
          )}
        </p>
        {isPaidQueue && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Đồng bộ & gán phòng
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">
          {isPaidQueue
            ? 'Chưa có booking PAID đang chờ xử lý.'
            : 'Chưa có booking PENDING.'}
        </p>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Khách</TableHead>
                <TableHead>Nhận / Trả</TableHead>
                <TableHead>Loại phòng</TableHead>
                {isPaidQueue && <TableHead>Phòng gán</TableHead>}
                {isPaidQueue && <TableHead>TT phòng</TableHead>}
                <TableHead>Thanh toán</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((booking) => {
                const stale = mounted && isPaidQueue && isPaidStale(booking);
                const room = booking.room;
                const typeRooms = roomsForType(booking.roomTypeId);

                return (
                  <TableRow key={booking.id} className={stale ? 'bg-amber-50/60' : undefined}>
                    <TableCell className="font-mono text-xs">
                      {booking.id.slice(0, 8)}…
                      {stale && !room && (
                        <span className="mt-1 block text-[10px] font-semibold text-amber-700">
                          PAID &gt; 30p
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {booking.guest?.fullName || '—'}
                      <span className="block text-xs text-muted-foreground">
                        {booking.guest?.phone || booking.guest?.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateOnlyVi(booking.checkIn)}
                      <span className="text-muted-foreground"> → </span>
                      {formatDateOnlyVi(booking.checkOut)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {booking.roomType?.name || '—'}
                    </TableCell>
                    {isPaidQueue && (
                      <TableCell>
                        {room ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <BedDouble className="h-4 w-4 text-muted-foreground" />
                            {room.roomNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">Chưa gán</span>
                        )}
                        {can('bookings:write') && (
                          <Select
                            value={booking.roomId ?? ''}
                            onValueChange={(roomId) =>
                              reassignMutation.mutate({ bookingId: booking.id, roomId })
                            }
                          >
                            <SelectTrigger className="mt-2 h-8 text-xs">
                              <SelectValue placeholder="Đổi phòng" />
                            </SelectTrigger>
                            <SelectContent>
                              {typeRooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.roomNumber} ({ROOM_STATUS_LABEL[r.status]})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
                    {isPaidQueue && (
                      <TableCell>
                        {room && canEditRoomStatus ? (
                          <Select
                            value={room.status}
                            onValueChange={(status) => {
                              const next = status as RoomStatus;
                              if (!canTransition(room.status, next)) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Chuyển trạng thái không hợp lệ',
                                  description: `${ROOM_STATUS_LABEL[room.status]} → ${ROOM_STATUS_LABEL[next]}`,
                                });
                                return;
                              }
                              roomStatusMutation.mutate({
                                roomId: room.id,
                                status: next,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[room.status, ...getValidTransitions(room.status)]
                                .filter((v, i, a) => a.indexOf(v) === i)
                                .map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {ROOM_STATUS_LABEL[s]}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : room ? (
                          <Badge variant="outline" className="text-xs">
                            {ROOM_STATUS_LABEL[room.status]}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs"
                            disabled={assignRoomMutation.isPending}
                            onClick={() => assignRoomMutation.mutate(booking.id)}
                          >
                            Gán phòng
                          </Button>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={
                          booking.paymentStatus === PaymentStatus.PAID
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {booking.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <CancelBookingDialog
                          booking={booking}
                          propertyId={propertyId}
                          queryKeyPrefix={queryKey}
                          compact
                        />
                        {isPaidQueue && (
                          <>
                            <FrontDeskCheckInDialog
                              booking={booking}
                              propertyId={propertyId}
                              roomReservationByRoomId={roomReservationByRoomId}
                              compact
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              disabled={
                                generateTokenMutation.isPending || !!booking.checkinToken
                              }
                              onClick={() => generateTokenMutation.mutate(booking.id)}
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              {booking.checkinToken ? 'Đã có QR' : 'Tạo QR'}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
