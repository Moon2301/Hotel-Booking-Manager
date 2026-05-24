import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoices, confirmManualPayment } from '@/lib/api/invoices';

export const invoiceKeys = {
  all: ['invoices'] as const,
};

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.all,
    queryFn: getInvoices,
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, method }: { id: string; method: 'CASH' | 'CARD' }) => confirmManualPayment(id, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}
