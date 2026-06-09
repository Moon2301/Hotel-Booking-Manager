'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoomTypes } from '@/hooks/use-room-types';
import { useCreateRoom } from '@/hooks/use-rooms';
import { roomSchema, type RoomFormValues } from '@/schemas/room.schema';

interface RoomCreateDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomCreateDialog({
  propertyId,
  open,
  onOpenChange,
}: RoomCreateDialogProps) {
  const { data: roomTypes = [], isLoading: isLoadingRoomTypes } = useRoomTypes(propertyId);
  const createMutation = useCreateRoom(propertyId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      roomTypeId: '',
      roomNumber: '',
      floor: undefined,
      notes: '',
    },
  });

  // Reset form when modal opens or closes
  React.useEffect(() => {
    if (open) {
      reset({
        roomTypeId: '',
        roomNumber: '',
        floor: undefined,
        notes: '',
      });
    }
  }, [open, reset]);

  async function onSubmit(data: RoomFormValues) {
    try {
      await createMutation.mutateAsync({
        roomTypeId: data.roomTypeId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        notes: data.notes,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handling is managed by the hook toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thêm phòng vật lý</DialogTitle>
          <DialogDescription>
            Thêm một số phòng cụ thể (ví dụ: Phòng 101, 102...) vào hệ thống quản lý.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomTypeId">Loại phòng *</Label>
            <Controller
              name="roomTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingRoomTypes}
                >
                  <SelectTrigger id="roomTypeId">
                    <SelectValue placeholder={isLoadingRoomTypes ? 'Đang tải...' : 'Chọn loại phòng'} />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roomTypeId && (
              <p className="text-sm text-destructive">{errors.roomTypeId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Số / Tên phòng *</Label>
              <Input
                id="roomNumber"
                placeholder="e.g. 101, P.202"
                {...register('roomNumber')}
              />
              {errors.roomNumber && (
                <p className="text-sm text-destructive">{errors.roomNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Tầng</Label>
              <Input
                id="floor"
                type="number"
                placeholder="e.g. 1"
                {...register('floor')}
              />
              {errors.floor && (
                <p className="text-sm text-destructive">{errors.floor.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Gần thang máy, có ban công hướng đông..."
              rows={3}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Thêm phòng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
