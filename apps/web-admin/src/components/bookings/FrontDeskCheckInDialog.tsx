'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Booking, Room } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogIn, Plus, Trash2 } from 'lucide-react';

interface FrontDeskCheckInDialogProps {
  booking: Booking;
  propertyId: string;
  compact?: boolean;
}

type OccupantRow = {
  key: string;
  fullName: string;
  idDocumentType: 'CCCD' | 'PASSPORT';
  idDocumentNumber: string;
  isPrimary: boolean;
};

function newOccupantRow(
  partial?: Partial<OccupantRow>,
): OccupantRow {
  return {
    key: crypto.randomUUID(),
    fullName: '',
    idDocumentType: 'CCCD',
    idDocumentNumber: '',
    isPrimary: false,
    ...partial,
  };
}

const ROOM_STATUS_VI: Record<string, string> = {
  AVAILABLE: 'Trống',
  RESERVED: 'Đã đặt',
  OCCUPIED: 'Đang ở',
  CLEANING: 'Dọn dẹp',
  MAINTENANCE: 'Bảo trì',
};

export function FrontDeskCheckInDialog({
  booking,
  propertyId,
  compact,
}: FrontDeskCheckInDialogProps) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [occupants, setOccupants] = useState<OccupantRow[]>([]);

  useEffect(() => {
    if (open) {
      setRoomId(booking.roomId ?? '');
      setOccupants([
        newOccupantRow({
          fullName: booking.guest?.fullName ?? '',
          isPrimary: true,
        }),
      ]);
    }
  }, [open, booking.roomId, booking.guest?.fullName]);

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => get<Room[]>(`/properties/${propertyId}/rooms`),
    enabled: open && !!propertyId,
  });

  const { data: reservedBookings } = useQuery({
    queryKey: ['bookings-room-reservations', propertyId],
    queryFn: () =>
      get<{ data: Booking[] }>(
        `/bookings?propertyId=${propertyId}&status=CONFIRMED&limit=200`,
      ),
    enabled: open && !!propertyId,
  });

  const roomReservationMap = useMemo(() => {
    const map = new Map<string, Booking>();
    reservedBookings?.data?.forEach((b) => {
      if (b.roomId) map.set(b.roomId, b);
    });
    return map;
  }, [reservedBookings]);

  const checkInRooms =
    rooms?.filter(
      (r) =>
        r.roomTypeId === booking.roomTypeId &&
        (r.status === 'RESERVED' || r.status === 'AVAILABLE'),
    ) ?? [];

  const checkInMutation = useMutation({
    mutationFn: () =>
      patch<Booking>(`/bookings/${booking.id}/check-in`, {
        roomId,
        occupants: occupants.map((o) => ({
          fullName: o.fullName.trim(),
          idDocumentType: o.idDocumentType,
          idDocumentNumber: o.idDocumentNumber.trim(),
          isPrimary: o.isPrimary,
        })),
      }),
    onSuccess: () => {
      toast({
        title: 'Check-in thành công',
        description: `Phòng chuyển sang Đang sử dụng · ${occupants.length} người lưu trú.`,
      });
      queryClient.invalidateQueries({ queryKey: ['bookings', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['bookings-paid', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['bookings-room-reservations', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
      setOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Check-in thất bại',
        description: Array.isArray(msg) ? msg.join(', ') : msg || 'Vui lòng thử lại',
      });
    },
  });

  const addOccupant = () => {
    setOccupants((prev) => [...prev, newOccupantRow()]);
  };

  const removeOccupant = (key: string) => {
    setOccupants((prev) => {
      const next = prev.filter((o) => o.key !== key);
      if (!next.some((o) => o.isPrimary) && next.length > 0) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const updateOccupant = (key: string, patchRow: Partial<OccupantRow>) => {
    setOccupants((prev) =>
      prev.map((o) => {
        if (o.key !== key) {
          if (patchRow.isPrimary) return { ...o, isPrimary: false };
          return o;
        }
        return { ...o, ...patchRow };
      }),
    );
  };

  const primaryOccupant = occupants.find((o) => o.isPrimary) ?? occupants[0];
  const canSubmit =
    !!roomId &&
    checkInRooms.length > 0 &&
    occupants.length > 0 &&
    occupants.every(
      (o) => o.idDocumentNumber.trim() && (o.isPrimary ? true : o.fullName.trim()),
    ) &&
    (primaryOccupant?.fullName.trim() || booking.guest?.fullName);

  if (!can('bookings:checkin')) return null;
  if (booking.status !== 'CONFIRMED') return null;
  if (booking.paymentStatus !== 'PAID') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={compact ? 'h-8 gap-1 text-xs' : 'w-full gap-2'}
        >
          <LogIn className="h-4 w-4" />
          Check-in tại quầy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-in lễ tân</DialogTitle>
          <DialogDescription asChild>
            <div>
              Chọn phòng <strong>đã đặt (RESERVED)</strong>, khai báo từng người lưu trú
              (CCCD/Hộ chiếu). Sau xác nhận phòng tự chuyển{' '}
              <strong>Đang sử dụng (OCCUPIED)</strong>.
            </div>
          </DialogDescription>
        </DialogHeader>

        {mounted && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Phòng</Label>
              {roomsLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải phòng...</p>
              ) : checkInRooms.length === 0 ? (
                <p className="text-sm text-destructive">
                  Không có phòng RESERVED/AVAILABLE cho loại phòng này.
                </p>
              ) : (
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng" />
                  </SelectTrigger>
                  <SelectContent>
                    {checkInRooms.map((r) => {
                      const reservedFor = roomReservationMap.get(r.id);
                      const isThisBooking = r.id === booking.roomId;
                      const isOtherBooking =
                        reservedFor && reservedFor.id !== booking.id;
                      const label =
                        r.status === 'RESERVED'
                          ? isThisBooking
                            ? ' — Phiếu này'
                            : isOtherBooking
                              ? ` — Đã đặt: ${reservedFor.guest?.fullName || 'khách khác'}`
                              : ' — Đã đặt'
                          : '';

                      return (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          disabled={!!isOtherBooking}
                        >
                          {r.roomNumber} ({ROOM_STATUS_VI[r.status] ?? r.status}
                          ){label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {booking.roomId && (
                <p className="text-xs text-muted-foreground">
                  Phòng gán khi thanh toán:{' '}
                  <strong>
                    {rooms?.find((r) => r.id === booking.roomId)?.roomNumber ??
                      booking.room?.roomNumber ??
                      '—'}
                  </strong>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Người lưu trú ({occupants.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={addOccupant}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm người
                </Button>
              </div>

              {occupants.map((row, index) => (
                <div
                  key={row.key}
                  className="space-y-3 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Người {index + 1}
                      {row.isPrimary && (
                        <span className="ml-1 text-primary">· Chính</span>
                      )}
                    </span>
                    {occupants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeOccupant(row.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Họ tên</Label>
                    <Input
                      value={row.fullName}
                      onChange={(e) =>
                        updateOccupant(row.key, { fullName: e.target.value })
                      }
                      placeholder={
                        row.isPrimary
                          ? booking.guest?.fullName || 'Nguyễn Văn A'
                          : 'Họ tên đầy đủ'
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Loại giấy tờ</Label>
                      <Select
                        value={row.idDocumentType}
                        onValueChange={(v) =>
                          updateOccupant(row.key, {
                            idDocumentType: v as 'CCCD' | 'PASSPORT',
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CCCD">CCCD</SelectItem>
                          <SelectItem value="PASSPORT">Hộ chiếu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Số giấy tờ</Label>
                      <Input
                        value={row.idDocumentNumber}
                        onChange={(e) =>
                          updateOccupant(row.key, {
                            idDocumentNumber: e.target.value,
                          })
                        }
                        placeholder={
                          row.idDocumentType === 'CCCD' ? '001234567890' : 'N1234567'
                        }
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {occupants.length > 1 && (
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name={`primary-${booking.id}`}
                        checked={row.isPrimary}
                        onChange={() =>
                          updateOccupant(row.key, { isPrimary: true })
                        }
                      />
                      Người đặt phòng chính (My Stay)
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending || !canSubmit}
          >
            {checkInMutation.isPending ? 'Đang xử lý...' : 'Xác nhận check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
