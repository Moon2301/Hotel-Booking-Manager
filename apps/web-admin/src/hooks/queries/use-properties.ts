'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from '@/lib/api/properties';
import type { Property } from '@/types';

export const propertyKeys = {
  all: ['properties'] as const,
  detail: (id: string) => ['properties', id] as const,
};

/**
 * Hook to fetch all properties.
 */
export function useProperties() {
  return useQuery({
    queryKey: propertyKeys.all,
    queryFn: getProperties,
  });
}

/**
 * Hook to fetch a single property by ID.
 */
export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => getProperty(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new property.
 */
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) =>
      createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

/**
 * Hook to update an existing property.
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => updateProperty(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      queryClient.invalidateQueries({
        queryKey: propertyKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a property.
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}
