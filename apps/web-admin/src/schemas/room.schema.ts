import { z } from 'zod';

/**
 * Zod schema for physical room creation form.
 * Validates roomNumber (required), roomTypeId (required), floor (optional number), and notes (optional).
 */
export const roomSchema = z.object({
  roomTypeId: z.string().min(1, 'Vui lòng chọn loại phòng'),
  roomNumber: z.string().min(1, 'Số phòng không được để trống'),
  floor: z.coerce.number().int().optional(),
  notes: z.string().optional(),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
