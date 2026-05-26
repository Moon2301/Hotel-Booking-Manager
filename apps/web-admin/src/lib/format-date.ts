/**
 * Format YYYY-MM-DD (or ISO) without timezone shift — safe for SSR hydration.
 */
export function formatDateOnlyVi(value: string): string {
  const part = value.split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return part;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d)}/${pad(m)}/${y}`;
}

export function formatTimeVi(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
