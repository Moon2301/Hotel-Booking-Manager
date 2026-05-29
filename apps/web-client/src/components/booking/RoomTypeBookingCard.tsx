import { useState, useEffect } from 'react';
import { Users, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getRoomPresentation } from '../../data/room-presentations';
import { fetchDailyAvailability } from '../../lib/booking-api';

interface RoomTypeBookingCardProps {
  propertyId: string;
  roomTypeId: string;
  name: string;
  description: string | null;
  amenities: string[];
  maxOccupancy: number;
  available: number;
  totalPrice: number | null;
  nightsCount: number;
  soldOut: boolean;
  capacityExceeded?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

interface RoomDailyCalendarProps {
  propertyId: string;
  roomTypeId: string;
}

export function RoomDailyCalendar({ propertyId, roomTypeId }: RoomDailyCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const fromStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        // next month start
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const toStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;
        
        const data = await fetchDailyAvailability(propertyId, roomTypeId, fromStr, toStr);
        if (active) {
          const map: Record<string, number> = {};
          data.forEach((row) => {
            map[row.date] = row.available;
          });
          setAvailability(map);
        }
      } catch (err) {
        console.error('Failed to load daily availability', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [propertyId, roomTypeId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Monday start

  const calendarDays: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    const dateStr = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: dNum, isCurrentMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: i, isCurrentMonth: true });
  }

  const remaining = 42 - calendarDays.length;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthVal = currentMonth === 11 ? 0 : currentMonth + 1;
  for (let i = 1; i <= remaining; i++) {
    const dateStr = `${nextMonthYear}-${String(nextMonthVal + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: i, isCurrentMonth: false });
  }

  const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  return (
    <div className="flex flex-col h-full select-none">
      <style>{`
        .calendar-day-cell:hover .calendar-day-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translate(-50%, 0) scale(1) !important;
        }
      `}</style>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-800 dark:text-white">
          Lịch trống ({monthNames[currentMonth]} {currentYear})
        </h4>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-mango-accent" />
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 dark:text-white/40 mb-1">
          {weekdays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((day, idx) => {
            const isBooked = availability[day.dateStr] === 0;
            const isAvailable = !isBooked && availability[day.dateStr] > 0;
            const isPast = day.dateStr < `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            return (
              <div
                key={idx}
                className="calendar-day-cell relative flex aspect-square items-center justify-center cursor-pointer"
              >
                <div
                  className={`flex h-full w-full items-center justify-center text-[10px] rounded-full transition-all ${
                    !day.isCurrentMonth
                      ? 'text-slate-355 dark:text-white/15'
                      : isPast
                        ? 'text-slate-400 dark:text-white/25 line-through'
                        : 'text-slate-700 dark:text-white/80 font-medium'
                  } ${
                    day.isCurrentMonth && !isPast
                      ? isBooked
                        ? 'border border-rose-500 text-rose-600 font-bold bg-rose-500/10 dark:border-rose-400 dark:text-rose-400 dark:bg-rose-400/10'
                        : isAvailable
                          ? 'border border-emerald-500 text-emerald-600 font-bold bg-emerald-500/5 dark:border-emerald-400 dark:text-emerald-400 dark:bg-emerald-400/5'
                          : ''
                      : ''
                  }`}
                >
                  {day.dayNum}
                </div>

                {day.isCurrentMonth && (
                  <div
                    className="calendar-day-tooltip"
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      zIndex: 9999,
                      marginBottom: '6px',
                      transform: 'translate(-50%, 0) scale(0.9)',
                      opacity: 0,
                      visibility: 'hidden',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      color: '#ffffff',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '9px',
                      fontWeight: 600,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    {isPast
                      ? 'Đã qua'
                      : isBooked
                        ? 'Hết phòng'
                        : availability[day.dateStr] !== undefined
                          ? `Còn ${availability[day.dateStr]} phòng`
                          : 'Đang tải...'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RoomImageSlider({
  images,
  name,
  disabled,
}: {
  images: string[];
  name: string;
  disabled: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const selectSlide = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${name} - Ảnh ${idx + 1}`}
            className="h-full w-full shrink-0 object-cover"
            loading="lazy"
          />
        ))}
      </div>

      {images.length > 1 && !disabled && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-2 top-1/3 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60 opacity-0 group-hover:opacity-100 z-20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-2 top-1/3 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60 opacity-0 group-hover:opacity-100 z-20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Thumbnail preview list (4-5 images side by side with slide effect) */}
          <div className="absolute bottom-3 left-0 right-0 px-2 flex justify-center gap-1.5 z-10 overflow-x-auto no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => selectSlide(idx, e)}
                className={`relative h-9 w-12 sm:h-11 sm:w-15 shrink-0 overflow-hidden rounded-md border-2 transition-all duration-300 ${
                  currentIndex === idx
                    ? 'border-mango-accent scale-105 shadow-md shadow-mango-accent/30'
                    : 'border-white/40 opacity-70 hover:opacity-100 hover:scale-105'
                }`}
              >
                <img
                  src={img}
                  alt={`${name} - Nhỏ ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function RoomTypeBookingCard({
  propertyId,
  roomTypeId,
  name,
  description,
  amenities,
  maxOccupancy,
  available,
  totalPrice,
  nightsCount,
  soldOut,
  capacityExceeded = false,
  selected,
  onSelect,
}: RoomTypeBookingCardProps) {
  const presentation = getRoomPresentation({ name, description, amenities });
  const disabled = soldOut || capacityExceeded;

  return (
    <article
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
        disabled
          ? 'border-slate-200 bg-slate-50/50 dark:border-white/5 dark:bg-white/5 opacity-65'
          : selected
            ? 'border-mango-accent bg-mango-accent/[0.04] dark:bg-white/10 ring-2 ring-mango-accent/45 shadow-xl shadow-mango-accent/5'
            : 'border-slate-200 bg-white hover:border-mango-accent/40 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/[0.08]'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr_240px] divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/5">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[300px]">
          <RoomImageSlider
            images={presentation.imageUrls}
            name={name}
            disabled={disabled}
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/60 via-transparent to-transparent dark:from-mango-navy-950/80" />
          {presentation.badge && !disabled && (
            <span className="absolute left-3 top-3 rounded-full bg-mango-accent px-3 py-1 text-xs font-bold text-mango-navy-950">
              {presentation.badge}
            </span>
          )}
          {selected && !disabled && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white z-20">
              <Check className="h-3.5 w-3.5" />
              Đã chọn
            </span>
          )}
          {disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 dark:bg-mango-navy-950/70 backdrop-blur-sm z-20">
              <span className="rounded-full bg-rose-600 px-4 py-2 text-center text-sm font-bold text-white">
                {capacityExceeded
                  ? `Không đủ chỗ (tối đa ${maxOccupancy} khách)`
                  : 'Hết phòng'}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-white/60">
                <Users className="h-4 w-4 text-sky-600 dark:text-mango-accent" />
                Tối đa {maxOccupancy} khách
                {!disabled && (
                  <span className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Còn {available} phòng
                  </span>
                )}
              </p>
            </div>
            {!disabled && totalPrice != null && (
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 dark:text-mango-accent">
                  {formatVnd(totalPrice)}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Tổng {nightsCount} đêm · đã gồm thuế
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-white/75">
            {presentation.description}
          </p>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
              Tiện ích trong phòng
            </p>
            <ul className="flex flex-wrap gap-2">
              {presentation.amenities.map((a) => (
                <li
                  key={a.label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/85"
                >
                  <a.icon className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-mango-accent" />
                  {a.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={disabled}
              onClick={onSelect}
              className={`w-full rounded-full py-3.5 text-sm font-bold transition-all sm:w-auto sm:px-10 ${
                disabled
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-white/30'
                  : selected
                    ? 'bg-mango-accent text-mango-navy-950 shadow-lg shadow-mango-accent/25 hover:bg-mango-accent-light'
                    : 'bg-slate-900 text-white hover:bg-mango-accent hover:text-mango-navy-950 dark:bg-white dark:text-mango-navy-950 dark:hover:bg-mango-accent dark:hover:text-mango-navy-950'
              }`}
            >
              {disabled
                ? capacityExceeded
                  ? 'Chọn phòng khác'
                  : 'Không khả dụng'
                : selected
                  ? 'Tiếp tục thanh toán →'
                  : 'Chọn phòng này'}
            </button>
          </div>
        </div>

        <div className="flex flex-col p-6 bg-slate-50/20 dark:bg-slate-900/5 justify-center">
          <RoomDailyCalendar propertyId={propertyId} roomTypeId={roomTypeId} />
        </div>
      </div>
    </article>
  );
}
