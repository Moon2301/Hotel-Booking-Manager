import { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { GuestPortalEntry } from './components/guest/GuestPortalEntry';
import { GuestServiceTab } from './components/guest/GuestServiceTab';
import { ThemeToggle } from './components/ThemeToggle';
import { pageBg, panelCard } from './lib/theme-classes';
import { HomePage } from './pages/HomePage';
import { BookPage } from './pages/BookPage';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage';
import { RoomsPage } from './pages/RoomsPage';
import { ServicesPage } from './pages/ServicesPage';
import { PartnerReferralCapture } from './components/PartnerReferralCapture';
import { BookingQrCard } from './components/booking/BookingQrCard';
import {
  Calendar,
  CreditCard,
  LogOut,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  FileText,
  Hexagon,
  UtensilsCrossed,
} from 'lucide-react';

interface Guest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface Booking {
  id: string;
  bookingCode?: string | null;
  propertyId: string;
  roomTypeId: string;
  roomId: string | null;
  roomNumber?: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  totalAmount: number | null;
  checkinToken?: string | null;
  checkinTokenExpiresAt?: string | null;
  qrPayload?: string | null;
}

interface Invoice {
  id: string;
  bookingId: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  vnpayTransactionId: string | null;
  issuedAt: string;
  paidAt: string | null;
}

type StayTab = 'stay' | 'invoice' | 'service';

function normalizeDateOnly(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function sameBookingSnapshot(a: Booking | null, b: Booking): boolean {
  if (!a) return false;
  return (
    a.id === b.id &&
    a.bookingCode === b.bookingCode &&
    a.status === b.status &&
    a.roomId === b.roomId &&
    a.roomNumber === b.roomNumber &&
    a.paymentStatus === b.paymentStatus &&
    a.checkinToken === b.checkinToken &&
    a.qrPayload === b.qrPayload &&
    normalizeDateOnly(a.checkIn) === normalizeDateOnly(b.checkIn) &&
    normalizeDateOnly(a.checkOut) === normalizeDateOnly(b.checkOut) &&
    Number(a.totalAmount ?? 0) === Number(b.totalAmount ?? 0)
  );
}

function MyStay() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('guest_token'));
  const [guest, setGuest] = useState<Guest | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  
  // Login form state
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // Dashboard details state
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<StayTab>('stay');
  
  // Loading & Error states
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ status: 'success' | 'failed' | 'error', text: string } | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const sessionHydratedRef = useRef(false);
  const dashboardLoadedKeyRef = useRef<string | null>(null);

  const clearGuestSession = () => {
    localStorage.removeItem('guest_token');
    localStorage.removeItem('guest_data');
    localStorage.removeItem('booking_data');
    sessionHydratedRef.current = false;
    dashboardLoadedKeyRef.current = null;
    setToken(null);
    setGuest(null);
    setBooking(null);
    setInvoice(null);
  };

  const refetchInvoice = async (bookingId: string, authToken: string) => {
    const invoiceRes = await fetch(`/api/v1/invoices/booking/${bookingId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (invoiceRes.ok) {
      const invoiceData = await invoiceRes.json();
      setInvoice(invoiceData);
    }
  };

  const refetchGuestSession = async (authToken: string): Promise<boolean> => {
    const res = await fetch('/api/v1/auth/guest-session', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.status === 401) {
      clearGuestSession();
      return false;
    }
    if (!res.ok) return false;
    const session = await res.json();
    if (session.guest) {
      setGuest((prev) => {
        if (
          prev?.id === session.guest.id &&
          prev.fullName === session.guest.fullName &&
          prev.email === session.guest.email &&
          prev.phone === session.guest.phone
        ) {
          return prev;
        }
        localStorage.setItem('guest_data', JSON.stringify(session.guest));
        return session.guest;
      });
    }
    if (session.booking) {
      const merged: Booking = {
        ...session.booking,
        checkIn: normalizeDateOnly(session.booking.checkIn),
        checkOut: normalizeDateOnly(session.booking.checkOut),
        qrPayload: session.qrPayload ?? session.booking.qrPayload ?? null,
      };
      setBooking((prev) => {
        if (sameBookingSnapshot(prev, merged)) return prev;
        localStorage.setItem('booking_data', JSON.stringify(merged));
        return merged;
      });
    }
    return true;
  };

  const bookingQrValue =
    booking?.bookingCode || booking?.qrPayload || null;

  // Deep link: /my-stay?tab=invoice|stay
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'stay' || tab === 'invoice' || tab === 'service') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Handle VNPay redirect query parameters (?payment=success|failed|error)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (!paymentStatus) return;

    setActiveTab('invoice');

    if (paymentStatus === 'success') {
      setPaymentMessage({
        status: 'success',
        text: 'Thanh toán hoá đơn thành công qua cổng VNPay!',
      });
    } else if (paymentStatus === 'failed') {
      setPaymentMessage({
        status: 'failed',
        text: 'Thanh toán thất bại hoặc bị hủy giao dịch.',
      });
    } else if (paymentStatus === 'error') {
      const reason = searchParams.get('reason');
      const reasonText =
        reason === 'invalid_signature'
          ? 'Chữ ký VNPay không hợp lệ.'
          : reason === 'server_error'
            ? 'Lỗi xác nhận thanh toán trên server.'
            : reason || 'Không xác định';
      setPaymentMessage({ status: 'error', text: `Lỗi giao dịch: ${reasonText}` });
    }

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      next.delete('reason');
      setSearchParams(next, { replace: true });
    };

    const bookingId = booking?.id;
    if (paymentStatus === 'success' && token && bookingId) {
      Promise.all([
        refetchInvoice(bookingId, token),
        refetchGuestSession(token),
      ]).finally(clearParams);
    } else if (paymentStatus !== 'success') {
      clearParams();
    }
  }, [searchParams, setSearchParams, token, booking?.id]);

  // Hydrate guest/booking from localStorage once per login (avoid overwriting session refresh).
  useEffect(() => {
    if (!token) {
      sessionHydratedRef.current = false;
      return;
    }
    if (sessionHydratedRef.current) return;

    const savedGuest = localStorage.getItem('guest_data');
    const savedBooking = localStorage.getItem('booking_data');
    if (savedGuest && savedBooking) {
      const parsedBooking = JSON.parse(savedBooking) as Booking;
      setGuest(JSON.parse(savedGuest));
      setBooking({
        ...parsedBooking,
        checkIn: normalizeDateOnly(parsedBooking.checkIn),
        checkOut: normalizeDateOnly(parsedBooking.checkOut),
      });
    }
    sessionHydratedRef.current = true;
  }, [token]);

  const bookingId = booking?.id;

  // Load invoice; show full-page spinner only on first load per token+booking.
  useEffect(() => {
    if (!token || !bookingId) return;

    const loadKey = `${token}:${bookingId}`;
    const showSpinner = dashboardLoadedKeyRef.current !== loadKey;
    if (showSpinner) {
      dashboardLoadedKeyRef.current = loadKey;
      setDataLoading(true);
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const sessionOk = await refetchGuestSession(token);
        if (!sessionOk || cancelled) return;

        const invoiceRes = await fetch(`/api/v1/invoices/booking/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        if (invoiceRes.ok) {
          setInvoice(await invoiceRes.json());
        } else {
          setInvoice(null);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
      if (dashboardLoadedKeyRef.current === loadKey) {
        dashboardLoadedKeyRef.current = null;
      }
      setDataLoading(false);
    };
  }, [token, bookingId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingIdInput || !phoneInput) {
      setAuthError('Vui lòng điền đầy đủ mã đặt phòng và số điện thoại');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/v1/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingIdInput.trim(), phone: phoneInput.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setAuthError(result.message || 'Đăng nhập thất bại. Hãy kiểm tra lại thông tin.');
        return;
      }

      localStorage.setItem('guest_token', result.accessToken);
      localStorage.setItem('guest_data', JSON.stringify(result.guest));
      const bookingWithQr: Booking = {
        ...result.booking,
        checkIn: normalizeDateOnly(result.booking.checkIn),
        checkOut: normalizeDateOnly(result.booking.checkOut),
        qrPayload: result.qrPayload ?? result.booking.qrPayload ?? null,
      };
      localStorage.setItem('booking_data', JSON.stringify(bookingWithQr));

      sessionHydratedRef.current = true;
      dashboardLoadedKeyRef.current = null;
      setToken(result.accessToken);
      setGuest(result.guest);
      setBooking(bookingWithQr);
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearGuestSession();
    navigate('/my-stay');
  };

  const handlePayVNPay = async () => {
    if (!invoice || !token) return;
    setPayLoading(true);
    try {
      const res = await fetch('/api/v1/payment/vnpay/create-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (res.ok && data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setPaymentMessage({
        status: 'error',
        text: data?.message || 'Không tạo được liên kết thanh toán VNPay.',
      });
      setActiveTab('invoice');
    } catch {
      setPaymentMessage({
        status: 'error',
        text: 'Không kết nối được máy chủ thanh toán. Kiểm tra API đang chạy.',
      });
      setActiveTab('invoice');
    } finally {
      setPayLoading(false);
    }
  };

  const requestedTab = searchParams.get('tab');

  useEffect(() => {
    if (token && guest && bookingId) return;
    if (requestedTab === 'book') {
      navigate('/book', { replace: true });
    }
  }, [requestedTab, token, guest, bookingId, navigate]);

  if (!token || !guest || !booking) {
    return (
      <GuestPortalEntry
        bookingIdInput={bookingIdInput}
        phoneInput={phoneInput}
        authLoading={authLoading}
        authError={authError}
        requestedTab={requestedTab}
        onBookingIdChange={setBookingIdInput}
        onPhoneChange={setPhoneInput}
        onSubmit={handleLogin}
      />
    );
  }

  const tabBtn = (tab: StayTab) =>
    `py-4 px-5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
      activeTab === tab
        ? 'border-mango-accent text-mango-accent'
        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white'
    }`;

  // Authenticated Guest Dashboard
  return (
    <div className={`relative ${pageBg}`}>
      {/* Banner / Message Alert */}
      {paymentMessage && (
        <div className={`text-center py-4 px-6 text-sm font-bold text-white shadow-md animate-bounce flex items-center justify-center gap-2 ${
          paymentMessage.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
        }`}>
          {paymentMessage.status === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span>{paymentMessage.text}</span>
          <button 
            className="ml-4 underline hover:text-slate-100" 
            onClick={() => setPaymentMessage(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-mango-navy-950/90">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <Hexagon className="h-7 w-7 text-mango-accent" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Mango<span className="font-normal text-slate-600 dark:text-white/70"> Hotel</span>
              </span>
            </Link>
            <div className="hidden h-6 w-px bg-slate-300 dark:bg-white/15 sm:block" />
            <div className="flex items-center gap-2 text-slate-800 dark:text-white/85">
              <User className="h-5 w-5 text-mango-accent" />
              <span className="text-sm font-bold">{guest.fullName}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-xs tracking-wider text-slate-600 dark:bg-white/10 dark:text-white/50">
                {booking.bookingCode ?? '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/book"
              className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-mango-accent hover:text-mango-accent dark:border-white/20 dark:text-white/80 sm:inline-block"
            >
              Đặt phòng mới
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-400/50 hover:bg-rose-50 hover:text-rose-600 dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-mango-accent">
          My Stay
        </p>

        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/10">
          <button type="button" onClick={() => setActiveTab('stay')} className={tabBtn('stay')}>
            <Calendar className="h-5 w-5" />
            Kỳ nghỉ của tôi
          </button>
          <button type="button" onClick={() => setActiveTab('invoice')} className={tabBtn('invoice')}>
            <Receipt className="h-5 w-5" />
            Hoá đơn & Thanh toán
          </button>
          <button type="button" onClick={() => setActiveTab('service')} className={tabBtn('service')}>
            <UtensilsCrossed className="h-5 w-5" />
            Dịch vụ phòng
          </button>
        </div>

        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-mango-accent" />
            <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-white/60">Đang cập nhật thông tin...</p>
          </div>
        ) : (
          <>
            {activeTab === 'stay' && (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-mango-navy-900/80 dark:to-mango-navy-950/80 dark:shadow-xl dark:backdrop-blur space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Chi tiết đặt phòng</h2>
                    <p className="text-sm text-slate-600 dark:text-white/60">Thông tin tổng quan về lưu trú của bạn</p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    {booking.bookingCode && (
                      <div className="rounded-xl border border-mango-accent/30 bg-mango-accent/5 p-4 dark:border-mango-accent/40 dark:bg-mango-accent/10 sm:col-span-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Mã đặt phòng
                        </p>
                        <p className="font-mono text-2xl font-black tracking-[0.2em] text-slate-900 dark:text-white">
                          {booking.bookingCode}
                        </p>
                      </div>
                    )}
                    <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mã Phòng</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {booking.roomNumber
                          ? `Phòng ${booking.roomNumber}`
                          : 'Chưa xếp phòng (Đang xử lý)'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái đặt phòng</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                        booking.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                      <Clock className="h-8 w-8 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Check-in</p>
                        <p className="text-sm font-bold text-slate-800">{new Date(booking.checkIn).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                      <Clock className="h-8 w-8 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Check-out</p>
                        <p className="text-sm font-bold text-slate-800">{new Date(booking.checkOut).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar area: Check-in QR */}
                <div className="space-y-6">
                  {booking.status === 'CONFIRMED' && (
                    <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-5 text-left dark:border-amber-500/30 dark:bg-amber-500/10">
                      <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                        Chưa nhận phòng
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
                        Mang <strong>CCCD hoặc Hộ chiếu</strong> đến quầy lễ tân để check-in và
                        đăng ký tạm trú.
                      </p>
                    </div>
                  )}
                  {booking.status === 'CONFIRMED' &&
                    booking.paymentStatus === 'PAID' &&
                    bookingQrValue && (
                      <div className="space-y-2">
                        {booking.bookingCode && (
                          <p className="text-center font-mono text-2xl font-black tracking-[0.2em] text-slate-900 dark:text-white">
                            {booking.bookingCode}
                          </p>
                        )}
                        <BookingQrCard
                          value={bookingQrValue}
                          title="QR đặt phòng"
                          hint="Quét mã QR tại quầy (kèm CCCD/Hộ chiếu) để lễ tân tra cứu booking."
                          size={160}
                        />
                      </div>
                    )}
                  {booking.status === 'CONFIRMED' &&
                    booking.paymentStatus === 'PAID' &&
                    !bookingQrValue && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                          Check-in điện tử
                        </h3>
                        <p className="text-sm text-slate-500">
                          Đang tạo mã QR… tải lại trang hoặc liên hệ lễ tân.
                        </p>
                      </div>
                    )}
                  
                  <div className="flex h-[300px] flex-col justify-between rounded-2xl border border-mango-accent/30 bg-gradient-to-br from-mango-navy-900 to-mango-navy-950 p-6 text-white shadow-xl">
                  <div>
                    <h3 className="mb-2 text-2xl font-black tracking-tight">Mango Hotel & Resort</h3>
                    <p className="text-xs leading-relaxed text-white/70">123 Võ Nguyên Giáp, Đà Nẵng</p>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mango-accent">Hỗ trợ khách hàng</p>
                    <p className="mt-1 text-sm font-semibold">Hotline: (0236) 3888 999</p>
                    <p className="text-xs text-white/50">Chúng tôi hỗ trợ bạn mọi lúc trong kỳ nghỉ.</p>
                  </div>
                </div>
                </div>
              </div>
            )}

            {activeTab === 'service' && token && booking && (
              <GuestServiceTab token={token} bookingStatus={booking.status} />
            )}

            {activeTab === 'invoice' && (
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-mango-navy-900/80 dark:to-mango-navy-950/80 dark:shadow-xl dark:backdrop-blur">
                  <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                        Hoá đơn & Thanh toán
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-white/60">
                        Thanh toán online qua VNPay Sandbox — sau khi hoàn tất bạn sẽ được
                        chuyển về trang này.
                      </p>
                    </div>
                    {invoice && (
                      <span
                        className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold ${
                          invoice.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {invoice.paymentStatus === 'PAID'
                          ? 'Đã thanh toán'
                          : 'Chờ thanh toán'}
                      </span>
                    )}
                  </div>

                  {!invoice ? (
                    <div className="py-10 text-center text-slate-500">
                      <FileText className="mx-auto mb-3 h-12 w-12 opacity-35" />
                      <p>Chưa có hoá đơn cho đặt phòng này.</p>
                      <p className="mt-1 text-xs">
                        Liên hệ lễ tân để xuất hoá đơn trước khi thanh toán online.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-400">
                            Mã hoá đơn
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                            {invoice.id}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-400">
                            Ngày xuất
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border-2 border-dashed border-mango-accent/40 bg-mango-accent/10 p-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-mango-accent">
                          Số tiền cần thanh toán
                        </p>
                        <p className="mt-2 text-4xl font-black text-slate-900">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(invoice.totalAmount)}
                        </p>

                        {invoice.paymentStatus !== 'PAID' ? (
                          <div className="mt-6 space-y-3">
                            <p className="text-sm text-slate-600">
                              Bạn sẽ được chuyển sang cổng VNPay. Sau khi thanh toán,
                              hệ thống tự quay về{' '}
                              <span className="font-mono text-xs">/my-stay</span>.
                            </p>
                            <button
                              type="button"
                              onClick={handlePayVNPay}
                              disabled={payLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-full bg-mango-accent px-6 py-4 text-base font-bold text-mango-navy-950 shadow-lg shadow-mango-accent/20 transition-all hover:bg-mango-accent-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              <CreditCard className="h-5 w-5" />
                              {payLoading
                                ? 'Đang tạo liên kết VNPay...'
                                : 'Thanh toán qua VNPay'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 flex items-start gap-3 rounded-xl bg-white p-4 text-emerald-700">
                            <CheckCircle className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-sm font-bold">Đã thanh toán thành công</p>
                              <p className="text-xs text-slate-500">
                                Phương thức:{' '}
                                {invoice.paymentMethod === 'VNPAY'
                                  ? 'VNPay (Online)'
                                  : invoice.paymentMethod || '—'}
                              </p>
                              {invoice.paidAt && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Thời gian:{' '}
                                  {new Date(invoice.paidAt).toLocaleString('vi-VN')}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-slate-400">
                  Môi trường dev: đảm bảo API chạy tại{' '}
                  <span className="font-mono">localhost:3000</span> và web client tại{' '}
                  <span className="font-mono">localhost:8080</span>
                </p>
              </div>
            )}

          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PartnerReferralCapture />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/book/confirmation" element={<BookingConfirmationPage />} />
        <Route path="/my-stay" element={<MyStay />} />
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center font-bold text-slate-500">
              404 - Trang không tồn tại
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
