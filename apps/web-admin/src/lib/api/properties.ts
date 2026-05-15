import { get, post, put, del } from '@/lib/api-client';
import type { Property } from '@/types';

/**
 * Fetch all properties.
 */
export async function getProperties(): Promise<Property[]> {
  return get<Property[]>('/properties');
}

/**
 * Fetch a single property by ID.
 */
export async function getProperty(id: string): Promise<Property> {
  return get<Property>(`/properties/${id}`);
}

/**
 * Create a new property.
 */
export async function createProperty(
  data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Property> {
  return post<Property>('/properties', data);
}

/**
 * Update an existing property.
 */
export async function updateProperty(
  id: string,
  data: Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Property> {
  return put<Property>(`/properties/${id}`, data);
}

/**
 * Delete a property by ID.
 */
export async function deleteProperty(id: string): Promise<void> {
  return del<void>(`/properties/${id}`);
}
