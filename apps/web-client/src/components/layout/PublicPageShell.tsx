import { Link } from 'react-router-dom';
import { Hexagon } from 'lucide-react';

interface PublicPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function PublicPageShell({
  title,
  subtitle,
  children,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-white/10 bg-mango-navy-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-white">
            <Hexagon className="h-7 w-7 text-mango-accent" />
            <span className="font-bold">Mango Hotel</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/#rooms" className="text-white/70 hover:text-mango-accent">
              Phòng
            </Link>
            <Link to="/#amenities" className="text-white/70 hover:text-mango-accent">
              Tiện ích
            </Link>
            <Link to="/book" className="text-white/70 hover:text-mango-accent">
              Đặt phòng
            </Link>
            <Link
              to="/my-stay"
              className="rounded-full border border-white/30 px-4 py-1.5 text-white hover:border-mango-accent"
              title="Chỉ khi đã có mã đặt phòng"
            >
              Đã có booking?
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold text-mango-navy-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
