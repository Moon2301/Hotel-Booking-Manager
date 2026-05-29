import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { BookPageShell } from '../components/booking/BookPageShell';
import { BookingStepIndicator } from '../components/booking/BookingStepIndicator';
import { BookingSearchFilter } from '../components/booking/BookingSearchFilter';
import { RoomTypeBookingCard } from '../components/booking/RoomTypeBookingCard';
import { BookingSummaryAside } from '../components/booking/BookingSummaryAside';
import {
  addDaysIso,
  defaultStayDates,
  todayLocal,
} from '../lib/booking-dates';
import {
  fetchCatalog,
  fetchAvailability,
  fetchQuote,
  createHold,
  checkout,
  savePendingBooking,
  nightsBetween,
  type CatalogProperty,
} from '../lib/booking-api';

type Step = 'browse' | 'guest';

const defaults = defaultStayDates();

export function BookPage() {
  const [step, setStep] = useState<Step>('browse');
  const [catalog, setCatalog] = useState<CatalogProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const initialSearchDone = useRef(false);

  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [availability, setAvailability] = useState<Record<string, number>>(
    {},
  );
  const [quotes, setQuotes] = useState<Record<string, number>>({});
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(
    null,
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const today = todayLocal();
  const minCheckOut = checkIn ? addDaysIso(checkIn, 1) : '';
  const totalGuests = adults + children;

  const runSearch = useCallback(async () => {
    if (!catalog || !checkIn || !checkOut) {
      setError('Vui lòng chọn ngày nhận phòng và trả phòng.');
      return;
    }
    if (checkOut <= checkIn) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    if (adults < 1) {
      setError('Cần ít nhất 1 người lớn.');
      return;
    }

    setSearching(true);
    setError(null);
    setSelectedRoomTypeId(null);

    try {
      const rows = await fetchAvailability(catalog.id, checkIn, checkOut);
      const map: Record<string, number> = {};
      rows.forEach((r) => {
        map[r.roomTypeId] = r.available;
      });
      setAvailability(map);

      const quoteMap: Record<string, number> = {};
      await Promise.all(
        catalog.roomTypes
          .filter(
            (rt) =>
              (map[rt.id] ?? 0) > 0 && rt.maxOccupancy >= totalGuests,
          )
          .map(async (rt) => {
            const q = await fetchQuote(catalog.id, rt.id, checkIn, checkOut);
            quoteMap[rt.id] = q.totalAmount;
          }),
      );
      setQuotes(quoteMap);
      setHasSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tra cứu được phòng');
    } finally {
      setSearching(false);
    }
  }, [catalog, checkIn, checkOut, totalGuests]);

  useEffect(() => {
    fetchCatalog()
      .then((data) => {
        const first = data.properties[0] ?? null;
        setCatalog(first);
        if (!first) {
          setError(
            'Chưa có khách sạn trong hệ thống. Vui lòng chạy seed dữ liệu.',
          );
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!catalog || initialSearchDone.current) return;
    initialSearchDone.current = true;
    void runSearch();
  }, [catalog, runSearch]);

  const handleCheckInChange = (value: string) => {
    setCheckIn(value);
    if (checkOut && value >= checkOut) {
      setCheckOut(addDaysIso(value, 1));
    }
  };

  const handleSelectRoom = (roomTypeId: string) => {
    setSelectedRoomTypeId(roomTypeId);
    setStep('guest');
    setError(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalog || !selectedRoomTypeId || !checkIn || !checkOut) return;

    setSubmitting(true);
    setError(null);

    try {
      const nights = nightsBetween(checkIn, checkOut);
      const hold = await createHold(catalog.id, selectedRoomTypeId, nights);
      const result = await checkout({
        holdId: hold.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      savePendingBooking(result.booking.id, result.guest.phone);
      window.location.href = result.paymentUrl;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể hoàn tất đặt phòng',
      );
      setSubmitting(false);
    }
  };

  const selectedRoom = catalog?.roomTypes.find(
    (r) => r.id === selectedRoomTypeId,
  );
  const selectedTotal = selectedRoomTypeId
    ? quotes[selectedRoomTypeId]
    : undefined;

  const matchingCount =
    catalog?.roomTypes.filter((rt) => {
      const avail = availability[rt.id] ?? 0;
      return avail > 0 && rt.maxOccupancy >= totalGuests;
    }).length ?? 0;

  const stepSubtitle =
    step === 'browse'
      ? 'Chọn ngày, số khách và phòng phù hợp — thanh toán VNPay không cần đăng ký.'
      : 'Nhập thông tin liên hệ và hoàn tất thanh toán. Dùng cùng số điện thoại để vào My Stay sau này.';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mango-navy-950">
        <Loader2 className="h-10 w-10 animate-spin text-mango-accent" />
      </div>
    );
  }

  return (
    <BookPageShell title="Đặt phòng trực tuyến" subtitle={stepSubtitle}>
      {catalog && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70 shadow-sm">
          <MapPin className="h-4 w-4 shrink-0 text-mango-accent" />
          <span className="font-semibold text-slate-900 dark:text-white">{catalog.name}</span>
          {catalog.address && (
            <span className="hidden sm:inline">— {catalog.address}</span>
          )}
        </div>
      )}

      <BookingStepIndicator current={step} />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {step === 'browse' && catalog && (
        <div className="space-y-8">
          <BookingSearchFilter
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            children={children}
            searching={searching}
            minCheckIn={today}
            minCheckOut={minCheckOut}
            onCheckInChange={handleCheckInChange}
            onCheckOutChange={setCheckOut}
            onAdultsChange={setAdults}
            onChildrenChange={setChildren}
            onSearch={() => void runSearch()}
          />

          {hasSearched && !searching && (
            <p className="text-sm text-slate-600 dark:text-white/60">
              {matchingCount > 0
                ? `${matchingCount} loại phòng phù hợp · ${checkIn} → ${checkOut} · ${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''}`
                : 'Không có phòng trống phù hợp bộ lọc — thử đổi ngày hoặc giảm số khách.'}
            </p>
          )}

          <div className="space-y-6">
            {[...catalog.roomTypes]
              .sort((a, b) => {
                const rank = (rt: (typeof catalog.roomTypes)[0]) => {
                  const avail = availability[rt.id] ?? 0;
                  if (avail <= 0) return 0;
                  if (rt.maxOccupancy < totalGuests) return 1;
                  return 2;
                };
                return rank(b) - rank(a);
              })
              .map((rt) => {
              const avail = availability[rt.id] ?? 0;
              const soldOut = !hasSearched || avail <= 0;
              const capacityExceeded =
                hasSearched && avail > 0 && rt.maxOccupancy < totalGuests;

              return (
                <RoomTypeBookingCard
                  key={rt.id}
                  propertyId={catalog.id}
                  roomTypeId={rt.id}
                  name={rt.name}
                  description={rt.description}
                  amenities={rt.amenities}
                  maxOccupancy={rt.maxOccupancy}
                  available={avail}
                  totalPrice={quotes[rt.id] ?? null}
                  nightsCount={
                    checkIn && checkOut
                      ? nightsBetween(checkIn, checkOut).length
                      : 0
                  }
                  soldOut={soldOut}
                  capacityExceeded={capacityExceeded}
                  selected={selectedRoomTypeId === rt.id}
                  onSelect={() => handleSelectRoom(rt.id)}
                />
              );
              })}
          </div>
        </div>
      )}

      {step === 'guest' && selectedRoom && (
        <div className="grid gap-8 lg:grid-cols-5">
          <form
            onSubmit={handleConfirmBooking}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-mango-navy-900/80 dark:to-mango-navy-950/80 dark:backdrop-blur lg:col-span-3 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setStep('browse')}
              className="mb-4 flex items-center gap-1 text-sm font-semibold text-sky-600 dark:text-mango-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại chọn phòng
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Thông tin khách đặt phòng
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-white/60">
              Dùng đúng số điện thoại — bạn sẽ cần nó để vào My Stay sau này.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
                  Họ và tên
                </label>
                <input
                  required
                  className="field-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-mango-accent">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  required
                  className="field-input"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-mango-accent py-4 font-bold text-mango-navy-950 shadow-lg shadow-mango-accent/20 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận & thanh toán VNPay'
              )}
            </button>
          </form>

          <BookingSummaryAside
            roomName={selectedRoom.name}
            description={selectedRoom.description}
            amenities={selectedRoom.amenities}
            maxOccupancy={selectedRoom.maxOccupancy}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            children={children}
            totalAmount={selectedTotal}
          />
        </div>
      )}
    </BookPageShell>
  );
}
