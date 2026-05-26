import { get, patch, post } from '@/lib/api-client';
import type { ServiceCategory, ServiceItem } from '@/types';

export type CreateServiceItemInput = {
  name: string;
  category: ServiceCategory;
  unit: string;
  unitPrice: number;
  isActive?: boolean;
};

export type UpdateServiceItemInput = Partial<CreateServiceItemInput>;

export function listServiceItems(propertyId: string, includeInactive = false) {
  const q = includeInactive ? '?all=true' : '';
  return get<ServiceItem[]>(`/properties/${propertyId}/service-items${q}`);
}

export function createServiceItem(propertyId: string, data: CreateServiceItemInput) {
  return post<ServiceItem>(`/properties/${propertyId}/service-items`, data);
}

export function updateServiceItem(
  propertyId: string,
  id: string,
  data: UpdateServiceItemInput,
) {
  return patch<ServiceItem>(`/properties/${propertyId}/service-items/${id}`, data);
}
