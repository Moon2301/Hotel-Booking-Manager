import { z } from 'zod';

/**
 * Zod schema for the room type create/edit form.
 * Validates name (required), basePrice, maxOccupancy, amenities, and description.
 */
export const roomTypeSchema = z.object({
  name: z.string().min(1, 'Room type name is required'),
  basePrice: z.coerce.number().min(0, 'Base price must be 0 or greater'),
  maxOccupancy: z.coerce.number().int().min(1, 'Max occupancy must be at least 1').default(2),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  description: z.string().optional(),
});

export type RoomTypeFormValues = z.infer<typeof roomTypeSchema>;

/**
 * Common amenities available for selection.
 */
export const COMMON_AMENITIES = [
  'WiFi',
  'AC',
  'TV',
  'Minibar',
  'Pool',
  'Gym',
  'Balcony',
  'Sea View',
  'Bathtub',
  'Safe',
] as const;
