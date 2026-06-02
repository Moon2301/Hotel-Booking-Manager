import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BedDouble,
  CalendarCheck,
  Hexagon,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { pageBg, panelCard } from '../../lib/theme-classes';
interface GuestPortalEntryProps {
  bookingIdInput: string;
  phoneInput: string;
  authLoading: boolean;
  authError: string | null;
  requestedTab: string | null;
  onBookingIdChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const TAB_HINTS: Record<string, string> = {
  service:
    'Gửi yêu cầu chi tiết (dọn phòng, gọi món, xe…) chỉ sau khi đặt phòng. Chưa có mã? Xem tiện ích trên trang chủ hoặc đặt phòng trước.',
  invoice:
    'Thanh toán hoá đơn chỉ dành cho booking đã tạo. Chưa có mã? Hãy đặt phòng trước.',
  stay: 'Xem thông tin lưu trú sau khi bạn đã có mã đặt phòng.',
};

export function GuestPortalEntry({
  bookingIdInput,
  phoneInput,
  authLoading,
  authError,
  requestedTab,
  onBookingIdChange,
  onPhoneChange,
  onSubmit,
}: GuestPortalEntryProps) {
  const tabHint =
    requestedTab && TAB_HINTS[requestedTab]
      ? TAB_HINTS[requestedTab]
      : null;

  const isWrongPort =
    typeof window !== 'undefined' &&
    window.location.port === '3001';

  return (
    <div className={`${pageBg} px-4 py-10`}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-700 dark:text-white/80">
            <Hexagon className="h-7 w-7 text-mango-accent" />
            <span className="font-bold text-slate-900 dark:text-white">Mango Hotel</span>
          </Link>
          <ThemeToggle />
        </div>

        {isWrongPort && (
          <div className="mb-6 rounded-xl border border-amber-400/50 bg-amber-500/20 p-4 text-sm text-amber-100">
            <strong className="text-amber-300">Đây không phải trang khách.</strong>{' '}
            Vui lòng mở trang đặt phòng & My Stay tại{' '}
            <a
              href={
                import.meta.env.VITE_PUBLIC_SITE_URL ?? 'http://localhost:8080'
              }
              className="font-bold underline"
            >
              {import.meta.env.VITE_PUBLIC_SITE_URL ?? 'http://localhost:8080'}
            </a>
            .
          </div>
        )}

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
          <p>
            <strong className="text-mango-accent">Không phải đăng nhập email/mật khẩu.</strong>{' '}
            My Stay chỉ dành cho khách <em>đã có mã đặt phòng</em>. Xem phòng & dịch vụ không
            cần tài khoản.
          </p>
        </div>

        {tabHint && (
          <div className="mb-6 flex gap-2 rounded-xl border border-mango-accent/30 bg-mango-accent/10 p-4 text-sm text-slate-800 dark:text-white">
            <AlertTriangle className="h-5 w-5 shrink-0 text-mango-accent" />
            <span>{tabHint}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className={`${panelCard} p-6`}>
            <p className="text-xs font-bold uppercase tracking-wider text-mango-navy-700">
              Chưa có mã đặt phòng?
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-mango-navy-950">
              Khám phá & đặt phòng — không cần login
            </h1>
            <ul className="mt-6 space-y-3">
              <li>
                <Link
                  to="/#rooms"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-mango-accent hover:bg-slate-50"
                >
                  <BedDouble className="h-6 w-6 text-mango-accent" />
                  <span className="font-semibold text-slate-800">Xem phòng & giá</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/#amenities"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-mango-accent hover:bg-slate-50"
                >
                  <Sparkles className="h-6 w-6 text-mango-accent" />
                  <span className="font-semibold text-slate-800">Xem tiện ích khách sạn</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/book"
                  className="flex items-center gap-3 rounded-xl bg-mango-accent p-4 transition hover:bg-mango-accent-light"
                >
                  <CalendarCheck className="h-6 w-6 text-mango-navy-950" />
                  <span className="font-bold text-mango-navy-950">Đặt phòng & thanh toán</span>
                </Link>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-mango-accent/40 bg-white p-6 shadow-xl dark:border-mango-accent/30 dark:bg-gradient-to-br dark:from-mango-navy-900/90 dark:to-mango-navy-950/90">
            <p className="text-xs font-bold uppercase tracking-wider text-mango-accent">
              Đã đặt phòng rồi
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">
              Vào My Stay bằng mã 6 ký tự
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
              Nhập mã đặt phòng (6 ký tự) + SĐT như lúc thanh toán, không dùng email/mật khẩu.
            </p>

            {authError && (
              <div className="mt-4 flex gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600 dark:text-mango-accent">
                  Mã đặt phòng (6 ký tự)
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  className="field-input font-mono uppercase tracking-widest"
                  placeholder="VD: A3K9XM"
                  value={bookingIdInput}
                  onChange={(e) =>
                    onBookingIdChange(
                      e.target.value.replace(/\s+/g, '').toUpperCase(),
                    )
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600 dark:text-mango-accent">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  required
                  className="field-input"
                  placeholder="SĐT lúc đặt phòng"
                  value={phoneInput}
                  onChange={(e) => onPhoneChange(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-full bg-mango-accent py-3.5 font-bold text-mango-navy-950 shadow-lg shadow-mango-accent/20 hover:bg-mango-accent-light disabled:opacity-60"
              >
                {authLoading ? 'Đang xác thực...' : 'Vào My Stay'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
