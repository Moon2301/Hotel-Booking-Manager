import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { RoomMixLine } from '../../lib/room-mix-planner';
import { cartCapacity, cartRoomCount, cartTotalPrice } from '../../lib/room-mix-planner';

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

export type { RoomMixLine as CartLine };

interface BookingRoomCartProps {
  lines: RoomMixLine[];
  totalGuests: number;
  onChangeQuantity: (roomTypeId: string, quantity: number) => void;
  onContinue: () => void;
}

export function BookingRoomCart({
  lines,
  totalGuests,
  onChangeQuantity,
  onContinue,
}: BookingRoomCartProps) {
  if (!lines.length) return null;

  const rooms = cartRoomCount(lines);
  const capacity = cartCapacity(lines);
  const total = cartTotalPrice(lines);
  const enough = capacity >= totalGuests;

  return (
    <div className="sticky bottom-4 z-20 rounded-2xl border border-mango-accent/40 bg-mango-navy-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        <ShoppingBag className="h-5 w-5 text-mango-accent" />
        Đơn đặt phòng ({rooms} phòng)
      </div>

      <ul className="mb-3 max-h-36 space-y-2 overflow-y-auto text-sm">
        {lines.map((l) => (
          <li
            key={l.roomTypeId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
          >
            <span className="text-white/90">
              {l.name}{' '}
              <span className="text-white/50">
                ×{l.quantity} · tối đa {l.maxOccupancy}/phòng
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm số phòng"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white"
                onClick={() =>
                  onChangeQuantity(l.roomTypeId, Math.max(0, l.quantity - 1))
                }
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[1.5rem] text-center font-bold text-mango-accent">
                {l.quantity}
              </span>
              <button
                type="button"
                aria-label="Tăng số phòng"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white"
                onClick={() =>
                  onChangeQuantity(l.roomTypeId, l.quantity + 1)
                }
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-lg font-black text-mango-accent">
            {formatVnd(total)}
          </p>
          <p
            className={`text-xs ${enough ? 'text-emerald-300' : 'text-amber-300'}`}
          >
            {enough
              ? `Đủ chỗ cho ${totalGuests} khách (tối đa ${capacity} trên giường)`
              : `Cần thêm phòng — hiện ${capacity}/${totalGuests} chỗ`}
          </p>
        </div>
        <button
          type="button"
          disabled={!enough}
          onClick={onContinue}
          className="rounded-full bg-mango-accent px-6 py-3 text-sm font-bold text-mango-navy-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tiếp tục thanh toán →
        </button>
      </div>
    </div>
  );
}
