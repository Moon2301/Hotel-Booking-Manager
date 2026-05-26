'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patch } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Booking } from '@/types';
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
import { Ban } from 'lucide-react';

interface CancelBookingDialogProps {
  booking: Booking;
  propertyId: string;
  queryKeyPrefix: string;
  compact?: boolean;
}

const CANCELLABLE = new Set(['CONFIRMED', 'CHECKED_IN']);

export function CancelBookingDialog({
  booking,
  propertyId,
  queryKeyPrefix,
  compact,
}: CancelBookingDialogProps) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: () =>
      patch<{ booking: Booking; cancellationFee?: number; refundAmount?: number }>(
        `/bookings/${booking.id}/cancel`,
        { reason: reason.trim() || 'Hủy thủ công tại quầy lễ tân' },
      ),
    onSuccess: (data) => {
      toast({
        title: 'Đã hủy phiếu đặt phòng',
        description:
          data.refundAmount != null
            ? `Hoàn dự kiến: ${Number(data.refundAmount).toLocaleString('vi-VN')} VND`
            : undefined,
      });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', propertyId] });
      setOpen(false);
      setReason('');
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Không hủy được',
        description: Array.isArray(msg) ? msg.join(', ') : msg || 'Vui lòng thử lại',
      });
    },
  });

  if (!can('bookings:write')) return null;
  if (!CANCELLABLE.has(booking.status)) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            compact
              ? 'h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50'
              : 'w-full gap-2 border-rose-200 text-rose-700 hover:bg-rose-50'
          }
        >
          <Ban className="h-3.5 w-3.5" />
          Hủy phiếu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hủy phiếu đặt phòng</DialogTitle>
          <DialogDescription asChild>
            <div>
              Xác nhận hủy booking{' '}
              <span className="font-mono font-semibold">
                {booking.id.slice(0, 8)}…
              </span>
              {booking.status === 'CHECKED_IN' && (
                <span className="mt-2 block font-medium text-rose-600">
                  Khách đã check-in — hủy sẽ giải phóng phòng và cập nhật trạng thái hệ thống.
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`cancel-reason-${booking.id}`}>Lý do (tuỳ chọn)</Label>
          <Input
            id={`cancel-reason-${booking.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Khách đổi lịch, trùng phòng..."
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            {cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
