import { Users, Check, Minus, Plus } from 'lucide-react';
import { getRoomPresentation } from '../../data/room-presentations';
import { RoomAvailabilityCalendar } from './RoomAvailabilityCalendar';

interface RoomTypeBookingCardProps {
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
  cartQuantity?: number;
  maxCartQuantity?: number;
  onSelect: () => void;
  onAddToCart?: () => void;
  onCartQuantityChange?: (quantity: number) => void;
  availabilityByDate?: Record<string, number>;
  checkIn?: string;
  checkOut?: string;
  calendarLoading?: boolean;
}

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

export function RoomTypeBookingCard({
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
  cartQuantity = 0,
  maxCartQuantity = 0,
  onSelect,
  onAddToCart,
  onCartQuantityChange,
  availabilityByDate = {},
  checkIn,
  checkOut,
  calendarLoading = false,
}: RoomTypeBookingCardProps) {
  const presentation = getRoomPresentation({ name, description, amenities });
  const disabled = soldOut;
  const singleRoomDisabled = soldOut || capacityExceeded;

  return (
    <article
      className={`group overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
        disabled
          ? 'border-white/5 bg-white/5 opacity-60'
          : selected
            ? 'border-mango-accent bg-white/10 ring-2 ring-mango-accent/40 shadow-xl shadow-mango-accent/10'
            : 'border-white/10 bg-white/5 hover:border-mango-accent/40 hover:bg-white/[0.08]'
      }`}
    >
      <div className="grid lg:grid-cols-[minmax(0,300px)_1fr_minmax(0,240px)]">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[300px]">
          <img
            src={presentation.imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-mango-navy-950/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-mango-navy-950/60" />
          {presentation.badge && !disabled && (
            <span className="absolute left-3 top-3 rounded-full bg-mango-accent px-3 py-1 text-xs font-bold text-mango-navy-950">
              {presentation.badge}
            </span>
          )}
          {selected && !disabled && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
              <Check className="h-3.5 w-3.5" />
              Đã chọn
            </span>
          )}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-mango-navy-950/70 backdrop-blur-sm">
              <span className="rounded-full bg-rose-600 px-4 py-2 text-center text-sm font-bold text-white">
                Hết phòng
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white">{name}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                <Users className="h-4 w-4 text-mango-accent" />
                Tối đa {maxOccupancy} khách
                {!disabled && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    Còn {available} phòng
                  </span>
                )}
              </p>
            </div>
            {!disabled && totalPrice != null && (
              <div className="text-right">
                <p className="text-2xl font-black text-mango-accent">
                  {formatVnd(totalPrice)}
                </p>
                <p className="text-xs text-white/50">
                  Tổng {nightsCount} đêm · đã gồm thuế
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {presentation.description}
          </p>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mango-accent">
              Tiện ích trong phòng
            </p>
            <ul className="flex flex-wrap gap-2">
              {presentation.amenities.map((a) => (
                <li
                  key={a.label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/85"
                >
                  <a.icon className="h-3.5 w-3.5 shrink-0 text-mango-accent" />
                  {a.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
            {!soldOut && onCartQuantityChange && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Bớt phòng trong đơn"
                  disabled={cartQuantity <= 0}
                  onClick={() =>
                    onCartQuantityChange(Math.max(0, cartQuantity - 1))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[4rem] text-center text-sm font-bold text-white">
                  {cartQuantity > 0 ? `${cartQuantity} trong đơn` : 'Thêm đơn'}
                </span>
                <button
                  type="button"
                  aria-label="Thêm phòng vào đơn"
                  disabled={
                    maxCartQuantity > 0 && cartQuantity >= maxCartQuantity
                  }
                  onClick={() => {
                    if (cartQuantity === 0 && onAddToCart) onAddToCart();
                    else onCartQuantityChange(cartQuantity + 1);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-mango-accent/50 bg-mango-accent/20 text-mango-accent disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={singleRoomDisabled}
              onClick={onSelect}
              className={`rounded-full py-3.5 text-sm font-bold transition-all sm:px-8 ${
                singleRoomDisabled
                  ? 'cursor-not-allowed bg-white/10 text-white/30'
                  : selected
                    ? 'bg-mango-accent text-mango-navy-950 shadow-lg shadow-mango-accent/25'
                    : 'border border-white/25 bg-transparent text-white hover:border-mango-accent hover:text-mango-accent'
              }`}
            >
              {soldOut
                ? 'Không khả dụng'
                : capacityExceeded
                  ? 'Chỉ đặt kèm phòng khác'
                  : 'Đặt riêng loại này →'}
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 lg:border-l lg:border-t-0 lg:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mango-accent">
            Lịch trống
          </p>
          {calendarLoading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/50">
              Đang tải lịch...
            </div>
          ) : (
            <RoomAvailabilityCalendar
              availabilityByDate={availabilityByDate}
              checkIn={checkIn}
              checkOut={checkOut}
              focusDate={checkIn}
            />
          )}
        </div>
      </div>
    </article>
  );
}
