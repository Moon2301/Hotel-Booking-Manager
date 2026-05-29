import { Calendar, Loader2, Minus, Plus, Search, Users } from 'lucide-react';
import { panelCard } from '../../lib/theme-classes';

export interface BookingGuestCounts {
  adults: number;
  children: number;
}

interface BookingSearchFilterProps {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  searching: boolean;
  minCheckIn: string;
  minCheckOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onSearch: () => void;
}

function GuestStepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-[11px] text-slate-500 dark:text-white/50">{hint}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Giảm ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-200 text-slate-800 transition hover:border-mango-accent/50 disabled:opacity-30 dark:border-white/15 dark:bg-slate-700 dark:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[2ch] text-center text-lg font-bold text-slate-800 dark:text-mango-accent">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Tăng ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-200 text-slate-800 transition hover:border-mango-accent/50 disabled:opacity-30 dark:border-white/15 dark:bg-slate-700 dark:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BookingSearchFilter({
  checkIn,
  checkOut,
  adults,
  children,
  searching,
  minCheckIn,
  minCheckOut,
  onCheckInChange,
  onCheckOutChange,
  onAdultsChange,
  onChildrenChange,
  onSearch,
}: BookingSearchFilterProps) {
  const totalGuests = adults + children;

  return (
    <div className={`${panelCard} p-4 sm:p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Search className="h-5 w-5 text-sky-600 dark:text-mango-accent" />
          Tìm phòng
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-white/80">
          <Users className="h-3.5 w-3.5 text-sky-600 dark:text-mango-accent" />
          {totalGuests} khách ({adults} người lớn
          {children > 0 ? `, ${children} trẻ em` : ''})
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
              <Calendar className="h-3.5 w-3.5" />
              Nhận phòng
            </label>
            <input
              type="date"
              className="field-input"
              value={checkIn}
              min={minCheckIn}
              onChange={(e) => onCheckInChange(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
              <Calendar className="h-3.5 w-3.5" />
              Trả phòng
            </label>
            <input
              type="date"
              className="field-input disabled:opacity-40"
              value={checkOut}
              min={minCheckOut || checkIn}
              disabled={!checkIn}
              onChange={(e) => onCheckOutChange(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <GuestStepper
            label="Người lớn"
            hint="Từ 12 tuổi trở lên"
            value={adults}
            min={1}
            max={12}
            onChange={onAdultsChange}
          />
          <GuestStepper
            label="Trẻ em"
            hint="Dưới 12 tuổi"
            value={children}
            min={0}
            max={8}
            onChange={onChildrenChange}
          />
        </div>

        <div className="flex items-end lg:justify-end">
          <button
            type="button"
            onClick={onSearch}
            disabled={searching}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-mango-accent px-8 font-bold text-mango-navy-950 shadow-lg shadow-mango-accent/20 transition hover:bg-mango-accent-light disabled:opacity-60 lg:w-auto lg:min-w-[160px]"
          >
            {searching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tìm...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Tìm phòng
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
