import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Copy,
  Hexagon,
  Loader2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  clearPendingBooking,
  fetchConfirmation,
  loadPendingBooking,
  type ConfirmationResult,
} from '../lib/booking-api';
import { BookingQrCard } from '../components/booking/BookingQrCard';

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n);
}

export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const payment = searchParams.get('payment');
  const bookingIdParam = searchParams.get('bookingId');

  const [data, setData] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const pending = loadPendingBooking();
    const bookingId = bookingIdParam || pending?.bookingId;
    const phone = pending?.phone;

    if (!bookingId || !phone) {
      setError(
        'Không tìm thấy thông tin đặt phòng. Vui lòng kiểm tra email hoặc liên hệ lễ tân.',
      );
      setLoading(false);
      return;
    }

    fetchConfirmation(bookingId, phone)
      .then((result) => {
        setData(result);
        if (payment === 'success') {
          clearPendingBooking();
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Không tải được xác nhận'),
      )
      .finally(() => setLoading(false));
  }, [bookingIdParam, payment]);

  const displayCode =
    data?.booking.bookingCode ?? data?.bookingCode ?? '';

  const copyBookingCode = () => {
    if (!displayCode) return;
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPaid =
    data?.invoice?.paymentStatus === 'PAID' || payment === 'success';
  const isFailed = payment === 'failed';
  const isError = payment === 'error';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-white/10 bg-mango-navy-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <Hexagon className="h-7 w-7 text-mango-accent" />
            <span className="font-bold">Mango Hotel</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-mango-accent" />
            <p className="mt-4 text-slate-500">Đang tải xác nhận...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Không thể hiển thị xác nhận
            </h1>
            <p className="mt-2 text-slate-600">{error}</p>
            <Link
              to="/my-stay"
              className="mt-6 inline-block rounded-full bg-mango-accent px-6 py-3 font-bold text-mango-navy-950"
            >
              Thử đăng nhập My Stay
            </Link>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">
            <div
              className={`rounded-2xl p-6 text-center text-white shadow-lg ${
                isFailed || isError
                  ? 'bg-rose-600'
                  : isPaid
                    ? 'bg-emerald-600'
                    : 'bg-amber-500'
              }`}
            >
              {isFailed || isError ? (
                <XCircle className="mx-auto h-14 w-14" />
              ) : (
                <CheckCircle className="mx-auto h-14 w-14" />
              )}
              <h1 className="mt-4 text-2xl font-extrabold">
                {isFailed
                  ? 'Thanh toán thất bại'
                  : isError
                    ? 'Lỗi thanh toán'
                    : isPaid
                      ? 'Đặt phòng & thanh toán thành công!'
                      : 'Đặt phòng thành công — chờ thanh toán'}
              </h1>
              <p className="mt-2 text-sm text-white/90">
                {isPaid
                  ? 'Lưu lại mã 6 ký tự và số điện thoại bên dưới để truy cập My Stay.'
                  : 'Bạn có thể thanh toán lại từ cổng My Stay.'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-mango-accent">
                Mã đặt phòng
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="text-3xl font-black tracking-[0.2em] text-mango-navy-950">
                  {displayCode}
                </code>
                <button
                  type="button"
                  onClick={copyBookingCode}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Đã copy' : 'Copy'}
                </button>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Khách đặt phòng
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {data.guest.fullName}
                  </p>
                  <p className="text-sm text-slate-600">{data.guest.email}</p>
                  <p className="text-sm font-mono text-slate-800">
                    {data.guest.phone}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Phòng & khách sạn
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {data.roomType?.name ?? '—'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {data.property?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Nhận / Trả phòng
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {data.booking.checkIn} → {data.booking.checkOut}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Tổng tiền
                  </p>
                  <p className="mt-1 text-lg font-black text-mango-navy-950">
                    {formatVnd(data.booking.totalAmount)}
                  </p>
                  {data.invoice && (
                    <p className="text-xs text-slate-500">
                      Hoá đơn: {data.invoice.id.slice(0, 8)}… —{' '}
                      {data.invoice.paymentStatus === 'PAID'
                        ? 'Đã thanh toán'
                        : 'Chưa thanh toán'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isPaid && displayCode && (
              <div className="space-y-4">
                <BookingQrCard
                  value={displayCode}
                  title="QR đặt phòng"
                  hint="Quét mã QR tại quầy hoặc lưu ảnh để tra cứu."
                />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/my-stay"
                className="rounded-full bg-mango-accent px-8 py-4 text-center font-bold text-mango-navy-950 shadow-md"
              >
                Vào My Stay
              </Link>
              <Link
                to="/book"
                className="rounded-full border border-slate-300 px-8 py-4 text-center font-bold text-slate-700 hover:bg-white"
              >
                Đặt phòng khác
              </Link>
            </div>

            <p className="text-center text-xs text-slate-400">
              Đăng nhập My Stay bằng <strong>Mã đặt phòng</strong> +{' '}
              <strong>Số điện thoại</strong> ở trên.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
