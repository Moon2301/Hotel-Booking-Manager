import { Link } from 'react-router-dom';
import { Hexagon, ArrowUp } from 'lucide-react';
import { SITE_NAV } from './nav-config';

export function SiteFooter() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer id="contact" className="relative bg-slate-200 text-slate-600 dark:bg-mango-navy-950 dark:text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Hexagon className="h-8 w-8 text-mango-accent" />
              <span className="text-xl font-bold text-slate-900 dark:text-white">Mango Hotel</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed">
              123 Võ Nguyên Giáp, Đà Nẵng, Việt Nam
              <br />
              Hotline: (0236) 3888 999
              <br />
              Email: contact@mangohotel.vn
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-mango-accent">
              Điều hướng
            </p>
            <ul className="space-y-2 text-sm">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith('/#') || item.href.startsWith('#') ? (
                    <a
                      href={item.href}
                      className="transition-colors hover:text-mango-accent"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="transition-colors hover:text-mango-accent"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link to="/book" className="transition-colors hover:text-mango-accent">
                  Đặt phòng
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Mango Hotel. All rights reserved.</p>
          <p className="text-white/40">Powered by NestJS, React & Vite</p>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollTop}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-lg bg-mango-accent text-mango-navy-950 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-mango-accent-light"
        aria-label="Lên đầu trang"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}
