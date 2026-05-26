import { TrendingUp, Clock, Coins } from 'lucide-react';
import { useScrollReveal } from '../../hooks/use-scroll-reveal';

const ICONS = {
  bookings: TrendingUp,
  realtime: Clock,
  cost: Coins,
} as const;

const ITEMS = [
  { key: 'bookings' as const, label: 'Đặt phòng linh hoạt' },
  { key: 'realtime' as const, label: 'Cập nhật thời gian thực' },
  { key: 'cost' as const, label: 'Giảm chi phí vận hành' },
];

export function FeaturesStrip() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className="border-t border-slate-200 bg-slate-200 py-14 dark:border-white/5 dark:bg-mango-navy-700"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        {ITEMS.map((item, i) => {
          const Icon = ICONS[item.key];
          return (
            <div
              key={item.key}
              className={`flex flex-col items-center text-center transition-all duration-700 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 text-slate-800 dark:border-white/20 dark:text-white">
                <Icon className="h-7 w-7 stroke-[1.5]" />
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{item.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
