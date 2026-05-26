import { Link } from 'react-router-dom';
import { Hexagon } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { pageBg } from '../../lib/theme-classes';

interface BookPageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function BookPageShell({ children, title, subtitle }: BookPageShellProps) {
  return (
    <div className={pageBg}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-mango-accent/5 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-mango-accent/5 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-mango-navy-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <Hexagon className="h-8 w-8 text-mango-accent transition-transform group-hover:rotate-90" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              Mango<span className="font-normal text-slate-600 dark:text-white/70"> Hotel</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link to="/#rooms" className="hidden text-slate-600 hover:text-mango-accent dark:text-white/70 sm:block">
              Phòng
            </Link>
            <Link to="/my-stay" className="text-slate-600 hover:text-mango-accent dark:text-white/70">
              My Stay
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-200 via-slate-100 to-white py-12 dark:border-white/10 dark:from-mango-navy-900 dark:via-mango-navy-950 dark:to-mango-navy-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-mango-accent">
            Đặt phòng trực tuyến
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-white/70">{subtitle}</p>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
