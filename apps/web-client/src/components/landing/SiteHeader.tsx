import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X, Hexagon, Globe } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { SITE_NAV } from './nav-config';

function NavItem({
  item,
  className,
  onNavigate,
}: {
  item: (typeof SITE_NAV)[0];
  className: string;
  onNavigate?: () => void;
}) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {item.label}
      </a>
    );
  }
  if (item.href.startsWith('#') || item.href.startsWith('/#')) {
    return (
      <a href={item.href} className={className} onClick={onNavigate}>
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.href} className={className} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}

export function SiteHeader() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);
  const onHero = !scrolled;
  const lightTextOnBar = onHero || isDark;

  const headerShell = scrolled
    ? isDark
      ? 'border-b border-white/10 bg-mango-navy-950/90 py-3 shadow-lg backdrop-blur-xl'
      : 'border-b border-slate-200 bg-white/95 py-3 shadow-md backdrop-blur-xl'
    : 'bg-transparent py-5';

  const desktopLinkClass = lightTextOnBar
    ? 'px-3 py-2 text-sm font-medium text-white/90 transition-colors duration-300 hover:text-mango-accent'
    : 'px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-300 hover:text-mango-accent';

  const mobileLinkClass = lightTextOnBar
    ? 'block rounded-lg px-3 py-3 text-lg font-medium text-white transition-colors hover:bg-white/10'
    : 'block rounded-lg px-3 py-3 text-lg font-medium text-slate-800 transition-colors hover:bg-slate-100';

  const logoMain = lightTextOnBar ? 'text-white' : 'text-slate-900';
  const logoMuted = lightTextOnBar ? 'text-white/70' : 'text-slate-600';
  const menuBtn = lightTextOnBar ? 'text-white' : 'text-slate-800';
  const langBtn = lightTextOnBar ? 'text-white/70' : 'text-slate-600';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${headerShell}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2.5"
          onClick={closeMobile}
        >
          <Hexagon className="h-8 w-8 text-mango-accent transition-transform duration-300 group-hover:rotate-90" />
          <span className={`text-xl font-bold tracking-tight ${logoMain}`}>
            Mango<span className={`font-normal ${logoMuted}`}> Hotel</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {SITE_NAV.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              className={desktopLinkClass}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle variant={lightTextOnBar ? 'on-dark' : 'default'} />
          <Link
            to="/book"
            className="rounded-full bg-mango-accent px-5 py-2.5 text-sm font-bold text-mango-navy-950 shadow-lg shadow-mango-accent/25 transition-all duration-300 hover:scale-105 hover:bg-mango-accent-light hover:shadow-mango-accent/40"
          >
            Đặt phòng ngay
          </Link>
          <button
            type="button"
            className={`flex items-center gap-1 text-sm font-medium ${langBtn}`}
            aria-label="Ngôn ngữ"
          >
            <Globe className="h-4 w-4" />
            VI
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle variant={lightTextOnBar ? 'on-dark' : 'default'} />
        <button
          type="button"
          className={`rounded-lg p-2 ${menuBtn}`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 top-[60px] z-40 backdrop-blur-xl transition-all duration-500 lg:hidden ${
          isDark ? 'bg-mango-navy-950/98' : 'bg-white/98'
        } ${
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        <nav className="flex max-h-[calc(100vh-60px)] flex-col gap-1 overflow-y-auto p-6">
          {SITE_NAV.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              className={mobileLinkClass}
              onNavigate={closeMobile}
            />
          ))}
          <Link
            to="/book"
            className="mt-6 block rounded-full bg-mango-accent py-4 text-center font-bold text-mango-navy-950"
            onClick={closeMobile}
          >
            Đặt phòng ngay
          </Link>
        </nav>
      </div>
    </header>
  );
}
