import { useScrollReveal } from '../../hooks/use-scroll-reveal';
import { HOTEL_AMENITIES } from '../../data/amenities';

export function AmenitiesShowcaseSection() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      id="amenities"
      ref={ref}
      className="bg-gradient-to-b from-slate-100 to-white py-24 dark:from-mango-navy-900 dark:to-mango-navy-950"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`mb-12 text-center transition-all duration-700 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-wider text-mango-accent">
            Tiện ích & Dịch vụ
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Trải nghiệm trọn vẹn tại Mango Hotel
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-white/70">
            Khám phá tiện ích khách sạn ngay trên trang chủ. Gửi yêu cầu chi tiết
            (dọn phòng, gọi món, xe đưa đón…) sau khi đặt phòng qua My Stay.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOTEL_AMENITIES.map((item, i) => (
            <div
              key={item.title}
              className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 hover:border-mango-accent/40 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-sm dark:hover:bg-white/10 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: `${60 + i * 50}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mango-accent/15 text-mango-accent">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/65">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
