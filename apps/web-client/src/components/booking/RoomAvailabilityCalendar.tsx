import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysIso, parseLocalDate, todayLocal } from '../../lib/booking-dates';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface RoomAvailabilityCalendarProps {
  /** date (yyyy-MM-dd) → số phòng còn trống đêm đó */
  availabilityByDate: Record<string, number>;
  checkIn?: string;
  checkOut?: string;
  /** Tháng mở đầu (theo ngày nhận phòng đang chọn) */
  focusDate?: string;
}

function formatMonthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

export function RoomAvailabilityCalendar({
  availabilityByDate,
  checkIn,
  checkOut,
  focusDate,
}: RoomAvailabilityCalendarProps) {
  const today = todayLocal();
  const initial = focusDate ? parseLocalDate(focusDate) : new Date();

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startPad = (first.getDay() + 6) % 7;
    const grid: Array<{ date: string | null; key: string }> = [];

    for (let i = 0; i < startPad; i++) {
      grid.push({ date: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= lastDay; d++) {
      const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({ date, key: date });
    }
    return grid;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const inSelectedStay = (date: string) => {
    if (!checkIn || !checkOut) return false;
    return date >= checkIn && date < checkOut;
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-mango-navy-950/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-center text-xs font-bold capitalize text-white">
          {formatMonthTitle(viewYear, viewMonth)}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-white/45">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-0.5">
            {w}
          </span>
        ))}
      </div>

      <div className="mt-0.5 grid flex-1 grid-cols-7 gap-0.5">
        {cells.map(({ date, key }) => {
          if (!date) {
            return <span key={key} className="aspect-square" />;
          }

          const avail = availabilityByDate[date];
          const isPast = date < today;
          const hasData = avail !== undefined;
          const isAvailable = hasData && avail > 0;
          const isSoldOut = hasData && avail === 0;
          const inStay = inSelectedStay(date);

          let cellClass =
            'flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-colors ';
          if (isPast) {
            cellClass += 'text-white/25 ';
          } else if (inStay) {
            cellClass +=
              'bg-mango-accent/30 text-mango-accent ring-1 ring-mango-accent ';
          } else if (isAvailable) {
            cellClass +=
              'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-500/40 ';
          } else if (isSoldOut) {
            cellClass += 'bg-white/5 text-white/35 line-through ';
          } else {
            cellClass += 'text-white/50 ';
          }

          return (
            <span
              key={key}
              className={cellClass}
              title={
                hasData
                  ? isAvailable
                    ? `Còn ${avail} phòng`
                    : 'Hết phòng'
                  : undefined
              }
            >
              {parseLocalDate(date).getDate()}
            </span>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[10px] text-white/55">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-emerald-500/40 ring-1 ring-emerald-500/50" />
          Còn phòng
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-white/10" />
          Hết
        </span>
        {checkIn && checkOut && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-mango-accent/40 ring-1 ring-mango-accent" />
            Kỳ chọn
          </span>
        )}
      </div>
    </div>
  );
}

/** Chuyển API calendar → map theo ngày cho một loại phòng */
export function calendarDaysToMap(
  days: { date: string; available: number }[] | undefined,
): Record<string, number> {
  const map: Record<string, number> = {};
  days?.forEach((d) => {
    map[d.date] = d.available;
  });
  return map;
}

export function defaultCalendarRange(): { from: string; to: string } {
  const from = todayLocal();
  const to = addDaysIso(from, 90);
  return { from, to };
}
