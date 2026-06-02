import { Loader2, Sparkles } from 'lucide-react';
import type { RoomMixSuggestion } from '../../lib/room-mix-planner';

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

interface RoomMixSuggestionsProps {
  guests: number;
  loading: boolean;
  suggestions: RoomMixSuggestion[];
  onApply: (suggestion: RoomMixSuggestion) => void;
}

export function RoomMixSuggestions({
  guests,
  loading,
  suggestions,
  onApply,
}: RoomMixSuggestionsProps) {
  if (guests < 2) return null;

  return (
    <section className="rounded-2xl border border-mango-accent/30 bg-mango-accent/5 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Sparkles className="h-5 w-5 text-mango-accent" />
        <h2 className="text-lg font-bold text-white">
          Gợi ý cho {guests} khách
        </h2>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang tính phối phòng…
          </span>
        )}
      </div>

      {!loading && suggestions.length === 0 && (
        <p className="text-sm text-white/60">
          Chưa có gợi ý tự động — hãy thêm từng loại phòng vào đơn bên dưới (ví
          dụ 2 phòng đôi + 1 phòng 3 người).
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onApply(s)}
              className="flex h-full w-full flex-col rounded-xl border border-white/15 bg-white/5 p-4 text-left transition hover:border-mango-accent/50 hover:bg-white/10"
            >
              <span className="text-sm font-semibold text-white">
                {s.totalRooms} phòng · chỗ {s.totalCapacity} khách
              </span>
              <span className="mt-1 text-xs leading-relaxed text-white/65">
                {s.title}
              </span>
              <span className="mt-3 text-base font-bold text-mango-accent">
                {formatVnd(s.totalPrice)}
              </span>
              <span className="mt-2 text-xs font-semibold text-mango-accent">
                Dùng gợi ý này →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
