import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1920"
          alt="Khách sạn Mango"
          className={`h-full w-full object-cover transition-transform duration-[12000ms] ease-out ${
            loaded ? 'scale-100' : 'scale-110'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-mango-navy-950/70 via-mango-navy-900/50 to-mango-navy-950/90" />
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[45%] w-[52%] bg-mango-navy-950/95"
        style={{ clipPath: 'polygon(0 100%, 0 35%, 100% 100%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[45%] w-[52%] bg-mango-navy-950/95"
        style={{ clipPath: 'polygon(100% 100%, 100% 35%, 0 100%)' }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 pb-32 pt-28 sm:px-6 lg:px-8">
        <div
          className={`max-w-3xl transition-all duration-1000 ease-out ${
            loaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-mango-accent">
            Mango Hotel & Resort
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Trải nghiệm lưu trú đẳng cấp — bắt đầu{' '}
            <span className="font-accent text-mango-accent">ngay hôm nay</span>
          </h1>
          <p
            className={`mt-6 max-w-2xl text-lg text-white/80 transition-all delay-200 duration-1000 ${
              loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            Khám phá phòng nghỉ và tiện ích khách sạn — đặt phòng trực tuyến không
            cần tài khoản.
          </p>
          <div
            className={`mt-10 flex flex-wrap gap-4 transition-all delay-300 duration-1000 ${
              loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <Link
              to="/book"
              className="rounded-full bg-mango-accent px-8 py-4 text-sm font-bold text-mango-navy-950 shadow-xl shadow-mango-accent/30 transition-all duration-300 hover:scale-[1.02] hover:bg-mango-accent-light"
            >
              Đặt phòng ngay
            </Link>
            <a
              href="/#rooms"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              Xem phòng
            </a>
          </div>
        </div>

        <a
          href="#about"
          className={`absolute bottom-12 right-8 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-white transition-all duration-500 hover:border-mango-accent hover:text-mango-accent ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Cuộn xuống"
        >
          <ChevronDown className="h-6 w-6 animate-bounce-slow" />
        </a>
      </div>
    </section>
  );
}
