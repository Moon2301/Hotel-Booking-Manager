import { Link } from 'react-router-dom';
import { Hexagon, ArrowUp } from 'lucide-react';
import { SITE_NAV } from './nav-config';
import { getPartnerLinks, getSocialLinks } from '../../data/external-links';
import { FooterLinkList, FooterSocialIcons } from './FooterLinkList';

export function SiteFooter() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const socialLinks = getSocialLinks();
  const partnerLinks = getPartnerLinks();

  return (
    <footer
      id="contact"
      className="relative bg-slate-200 text-slate-600 dark:bg-mango-navy-950 dark:text-white/70"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Hexagon className="h-8 w-8 text-mango-accent" />
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                Mango Hotel
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              123 Võ Nguyên Giáp, Đà Nẵng, Việt Nam
              <br />
              Hotline: (0236) 3888 999
              <br />
              Email:{' '}
              <a
                href="mailto:contact@mangohotel.vn"
                className="text-mango-accent hover:underline"
              >
                contact@mangohotel.vn
              </a>
            </p>
            <FooterSocialIcons links={socialLinks} />
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-mango-accent">
              Điều hướng
            </p>
            <ul className="space-y-2 text-sm">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-mango-accent"
                    >
                      {item.label}
                    </a>
                  ) : item.href.startsWith('/#') || item.href.startsWith('#') ? (
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
                <Link
                  to="/book"
                  className="transition-colors hover:text-mango-accent"
                >
                  Đặt phòng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-mango-accent">
              Mạng xã hội
            </p>
            <FooterLinkList links={socialLinks} showIcons />
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-mango-accent">
              Đối tác
            </p>
            <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-white/45">
              Đặt phòng qua các kênh đối tác hoặc xem vị trí trên bản đồ.
            </p>
            <FooterLinkList links={partnerLinks} showIcons />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-300/60 pt-8 text-xs dark:border-white/10 sm:flex-row">
          <p className="text-slate-500 dark:text-white/50">
            &copy; {new Date().getFullYear()} Mango Hotel. All rights reserved.
          </p>
          <p className="text-slate-400 dark:text-white/35">
            Đặt trực tiếp trên website để ưu đãi tốt nhất.
          </p>
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
