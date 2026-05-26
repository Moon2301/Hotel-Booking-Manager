type Step = 'browse' | 'guest';

const STEPS: { id: Step; label: string }[] = [
  { id: 'browse', label: 'Chọn phòng' },
  { id: 'guest', label: 'Thanh toán' },
];

export function BookingStepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = s.id === current;
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    active
                      ? 'bg-mango-accent text-mango-navy-950 shadow-lg shadow-mango-accent/30'
                      : done
                        ? 'bg-mango-accent/30 text-mango-accent'
                        : 'border border-white/20 bg-white/5 text-white/40'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={`hidden text-xs font-semibold sm:block ${
                    active ? 'text-mango-accent' : 'text-white/50'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    i < currentIndex ? 'bg-mango-accent/60' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
