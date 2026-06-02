import { Users } from 'lucide-react';
import { getRoomPresentation } from '../../data/room-presentations';
import type { CartLine } from './BookingRoomCart';

interface BookingSummaryAsideProps {
  lines: CartLine[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number | undefined;
}

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

export function BookingSummaryAside({
  lines,
  checkIn,
  checkOut,
  adults,
  children,
  totalAmount,
}: BookingSummaryAsideProps) {
  const primary = lines[0];
  const presentation = primary
    ? getRoomPresentation({
        name: primary.name,
        description: null,
        amenities: [],
      })
    : null;

  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-white/10 dark:bg-gradient-to-b dark:from-mango-navy-900 dark:to-mango-navy-950 dark:text-white dark:shadow-xl lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
      {presentation && (
        <img
          src={presentation.imageUrl}
          alt={primary.name}
          className="h-44 w-full object-cover"
        />
      )}
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
          Tóm tắt đặt phòng
        </p>

        <ul className="mt-4 space-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
          {lines.map((l) => (
            <li key={l.roomTypeId} className="text-sm">
              <p className="font-bold text-slate-900 dark:text-white">
                {l.quantity}× {l.name}
              </p>
              <p className="text-slate-600 dark:text-white/55">
                Tối đa {l.maxOccupancy} khách/phòng ·{' '}
                {formatVnd(l.unitPrice * l.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-3 flex items-center gap-1 text-sm text-slate-600 dark:text-white/60">
          <Users className="h-4 w-4 text-sky-600 dark:text-mango-accent" />
          {lines.reduce((s, l) => s + l.quantity, 0) > 1
            ? `${lines.reduce((s, l) => s + l.quantity, 0)} phòng`
            : `Tối đa ${primary?.maxOccupancy ?? '—'} khách/phòng`}
        </p>

        <dl className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-white/60">Nhận phòng</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">
              {checkIn}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-white/60">Trả phòng</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">
              {checkOut}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-white/60">Khách</dt>
            <dd className="text-right font-semibold text-slate-900 dark:text-white">
              {adults} người lớn
              {children > 0 ? `, ${children} trẻ em` : ''}
            </dd>
          </div>
          <div className="flex justify-between pt-2">
            <dt className="text-slate-600 dark:text-white/60">Tổng cộng</dt>
            <dd className="text-lg font-black text-slate-900 dark:text-mango-accent">
              {totalAmount != null ? formatVnd(totalAmount) : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
