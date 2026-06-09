'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/image-upload';
import { useCreateRoomType } from '@/hooks/use-room-types';
import {
  roomTypeSchema,
  type RoomTypeFormValues,
  COMMON_AMENITIES,
} from '@/schemas/room-type.schema';

interface RoomTypeCreateDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomTypeCreateDialog({
  propertyId,
  open,
  onOpenChange,
}: RoomTypeCreateDialogProps) {
  const createMutation = useCreateRoomType(propertyId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name: '',
      basePrice: 0,
      maxOccupancy: 2,
      amenities: [],
      images: [],
      description: '',
    },
  });

  const selectedAmenities = watch('amenities');

  function toggleAmenity(amenity: string) {
    const current = selectedAmenities ?? [];
    if (current.includes(amenity)) {
      setValue(
        'amenities',
        current.filter((a) => a !== amenity)
      );
    } else {
      setValue('amenities', [...current, amenity]);
    }
  }

  async function onSubmit(data: RoomTypeFormValues) {
    await createMutation.mutateAsync(data);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Room Type</DialogTitle>
          <DialogDescription>
            Add a new room type to this property.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Deluxe Double"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (VND)</Label>
              <Input
                id="basePrice"
                type="number"
                min={0}
                {...register('basePrice')}
              />
              {errors.basePrice && (
                <p className="text-sm text-destructive">
                  {errors.basePrice.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxOccupancy">Max Occupancy</Label>
              <Input
                id="maxOccupancy"
                type="number"
                min={1}
                {...register('maxOccupancy')}
              />
              {errors.maxOccupancy && (
                <p className="text-sm text-destructive">
                  {errors.maxOccupancy.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedAmenities?.includes(amenity) ?? false}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Images</Label>
            <ImageUpload
              value={watch('images')}
              onChange={(images) => setValue('images', images)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description of this room type"
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
