import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/use-scroll-reveal';

export function AboutSection() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      id="about"
      ref={ref}
      className="relative -mt-1 bg-gradient-to-b from-slate-100 to-slate-200 pb-24 pt-8 dark:from-mango-navy-900 dark:to-mango-navy-800"
    >
      <div
        className="absolute -top-px left-0 right-0 h-16 bg-slate-100 dark:bg-mango-navy-900"
        style={{ borderRadius: '0 0 50% 50% / 0 0 3rem 3rem' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`mb-16 text-center transition-all duration-700 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-[2.5rem]">
            Chào mừng đến Mango Hotel
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-white/70">
            Khám phá phòng nghỉ và tiện ích ngay tại đây. Khi đã đặt phòng, bạn có
            thể quản lý kỳ nghỉ qua cổng My Stay.
          </p>
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-12">
          <div
            className={`overflow-hidden rounded-2xl shadow-2xl transition-all delay-100 duration-700 ${
              visible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}
          >
            <img
              src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=900"
              alt="Lễ tân Mango Hotel"
              className="h-full min-h-[280px] w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>

          <div
            className={`flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all delay-200 duration-700 dark:border-white/10 dark:bg-mango-navy-700/60 dark:backdrop-blur-sm sm:p-10 ${
              visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}
          >
            <p className="text-sm font-bold uppercase tracking-wider text-mango-accent">
              Chào mừng đến Mango Hotel
            </p>
            <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              Một cách mới để tận hưởng kỳ nghỉ của bạn
            </h3>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-white/75">
              Tận hưởng không gian nghỉ dưỡng ven biển với đầy đủ tiện nghi hiện đại.
              Đặt phòng trực tuyến chỉ với vài thông tin liên hệ — không cần tạo tài
              khoản trước.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-white/80">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mango-accent" />
                Xem phòng & tiện ích trên trang chủ
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mango-accent" />
                Đặt phòng & thanh toán VNPay online
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mango-accent" />
                Yêu cầu dịch vụ chi tiết sau khi có mã booking (My Stay)
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="inline-flex w-fit rounded-full bg-mango-accent px-6 py-3 text-sm font-bold text-mango-navy-950 transition-all duration-300 hover:bg-mango-accent-light"
              >
                Đặt phòng ngay
              </Link>
              <Link
                to="/my-stay"
                className="inline-flex w-fit rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-800 transition-all hover:bg-slate-100 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
              >
                Đã có booking — My Stay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
