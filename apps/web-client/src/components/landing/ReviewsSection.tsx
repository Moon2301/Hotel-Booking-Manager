import { useEffect, useMemo, useState } from 'react';
import { fetchCatalog } from '../../lib/booking-api';
import { fetchPublicReviews, type PublicReview } from '../../lib/reviews-api';

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-1 text-amber-400" aria-label={`${r} sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < r ? '' : 'opacity-25'}>
          ★
        </span>
      ))}
    </div>
  );
}

function formatDateVi(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const catalog = await fetchCatalog();
        const propertyId = catalog?.properties?.[0]?.id;
        if (!propertyId) return;
        const res = await fetchPublicReviews(propertyId, 6);
        if (!cancelled) setReviews(res.data ?? []);
      } catch {
        // Silent fail on landing page
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasReviews = reviews.length > 0;
  const cards = useMemo(() => reviews.slice(0, 6), [reviews]);

  return (
    <section className="py-14">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Đánh giá từ khách lưu trú
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Trải nghiệm thực tế của khách sau khi ở tại khách sạn.
          </p>
        </div>

        {!hasReviews && !loading ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Chưa có đánh giá công khai nào.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(loading ? Array.from({ length: 6 }) : cards).map((item, idx) => {
              const key = (item as any)?.id ?? idx;
              const content = (item as any)?.content as string | null | undefined;
              const rating = (item as any)?.rating as number | undefined;
              const createdAt = (item as any)?.createdAt as string | undefined;
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-4 w-28 rounded bg-slate-200/70 dark:bg-white/10" />
                      <div className="h-16 w-full rounded bg-slate-200/70 dark:bg-white/10" />
                      <div className="h-3 w-20 rounded bg-slate-200/70 dark:bg-white/10" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <Stars rating={rating ?? 5} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {createdAt ? formatDateVi(createdAt) : ''}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        “{content?.trim() || 'Khách hàng hài lòng về trải nghiệm lưu trú.'}”
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="h-7 w-7 rounded-full bg-slate-200/70 dark:bg-white/10" />
                        <span>Khách lưu trú</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

