import { get, patch } from '@/lib/api-client';
import type { Invoice } from '@/types';

export async function getInvoices() {
  return get<Invoice[]>('/invoices');
}

export async function confirmManualPayment(id: string, method: 'CASH' | 'CARD') {
  return patch<Invoice>(`/invoices/${id}/pay`, { method });
}
