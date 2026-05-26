import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { useScrollReveal } from '../../hooks/use-scroll-reveal';
import { fetchCatalog, type CatalogProperty } from '../../lib/booking-api';
import { getRoomPresentation } from '../../data/room-presentations';

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

export function RoomsShowcaseSection() {
  const { ref, visible } = useScrollReveal();
  const [property, setProperty] = useState<CatalogProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalog()
      .then((data) => setProperty(data.properties[0] ?? null))
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="rooms" ref={ref} className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`mb-12 text-center transition-all duration-700 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-wider text-mango-navy-700">
            Phòng & Suites
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-mango-navy-950 sm:text-4xl">
            Không gian nghỉ dưỡng tinh tế
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Mỗi loại phòng có ảnh thực tế, mô tả chi tiết và danh sách tiện ích
            trong phòng.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-mango-accent" />
          </div>
        )}

        {!loading && property && (
          <>
            <p className="mb-8 text-center text-sm text-slate-500">
              {property.name}
              {property.address ? ` · ${property.address}` : ''}
            </p>
            <div className="grid gap-8 lg:grid-cols-2">
              {property.roomTypes.map((rt, i) => {
                const p = getRoomPresentation(rt);
                return (
                  <article
                    key={rt.id}
                    className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:shadow-lg ${
                      visible
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-8 opacity-0'
                    }`}
                    style={{ transitionDelay: `${80 + i * 60}ms` }}
                  >
                    <img
                      src={p.imageUrl}
                      alt={rt.name}
                      className="aspect-[16/10] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-mango-navy-950">
                        {rt.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Users className="h-4 w-4" />
                        Tối đa {rt.maxOccupancy} khách · Từ{' '}
                        {formatVnd(rt.basePrice)}/đêm
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3">
                        {p.description}
                      </p>
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {p.amenities.slice(0, 4).map((a) => (
                          <li
                            key={a.label}
                            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                          >
                            {a.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
            {property.roomTypes.length === 0 && (
              <p className="text-center text-slate-500">
                Đang cập nhật danh sách phòng.
              </p>
            )}
          </>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/book"
            className="inline-block rounded-full bg-mango-accent px-10 py-4 font-bold text-mango-navy-950 shadow-lg transition hover:bg-mango-accent-light"
          >
            Chọn ngày & đặt phòng
          </Link>
        </div>
      </div>
    </section>
  );
}
