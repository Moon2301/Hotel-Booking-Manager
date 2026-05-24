import { get, patch } from '@/lib/api-client';
import type { Task, TaskStatus } from '@/types';

export async function getTasks(params?: { propertyId?: string; bookingId?: string; status?: TaskStatus }) {
  const query = new URLSearchParams();
  if (params?.propertyId) query.append('propertyId', params.propertyId);
  if (params?.bookingId) query.append('bookingId', params.bookingId);
  if (params?.status) query.append('status', params.status);

  return get<Task[]>(`/tasks?${query.toString()}`);
}

export async function updateTask(id: string, data: { status?: TaskStatus; staffReport?: string; assignedToId?: string }) {
  return patch<Task>(`/tasks/${id}`, data);
}
