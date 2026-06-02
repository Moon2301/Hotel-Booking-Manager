import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { BookPageShell } from '../components/booking/BookPageShell';
import { BookingStepIndicator } from '../components/booking/BookingStepIndicator';
import { BookingSearchFilter } from '../components/booking/BookingSearchFilter';
import { RoomTypeBookingCard } from '../components/booking/RoomTypeBookingCard';
import { BookingSummaryAside } from '../components/booking/BookingSummaryAside';
import {
  BookingRoomCart,
  type CartLine,
} from '../components/booking/BookingRoomCart';
import { RoomMixSuggestions } from '../components/booking/RoomMixSuggestions';
import {
  addDaysIso,
  defaultStayDates,
  todayLocal,
} from '../lib/booking-dates';
import {
  calendarDaysToMap,
  defaultCalendarRange,
} from '../components/booking/RoomAvailabilityCalendar';
import {
  fetchCatalog,
  fetchAvailability,
  fetchAvailabilityCalendar,
  fetchQuote,
  checkoutGroup,
  savePendingBooking,
  nightsBetween,
  type CatalogProperty,
} from '../lib/booking-api';
import { readPartnerRef } from '../lib/partner-referral';
import {
  suggestRoomMixes,
  cartTotalPrice,
  cartCapacity,
  type RoomMixSuggestion,
  type RoomCandidate,
} from '../lib/room-mix-planner';

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
  const [mixSuggestions, setMixSuggestions] = useState<RoomMixSuggestion[]>(
    [],
  );
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [calendarByRoomType, setCalendarByRoomType] = useState<
    Record<string, Record<string, number>>
  >({});
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const today = todayLocal();
  const minCheckOut = checkIn ? addDaysIso(checkIn, 1) : '';
  const totalGuests = adults + children;

  const loadCalendar = useCallback(async (propertyId: string) => {
    const { from, to } = defaultCalendarRange();
    setCalendarLoading(true);
    try {
      const data = await fetchAvailabilityCalendar(propertyId, from, to);
      const map: Record<string, Record<string, number>> = {};
      for (const [roomTypeId, days] of Object.entries(data.calendars)) {
        map[roomTypeId] = calendarDaysToMap(days);
      }
      setCalendarByRoomType(map);
    } catch {
      setCalendarByRoomType({});
    } finally {
      setCalendarLoading(false);
    }
  }, []);

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
    setCartLines([]);

    try {
      const rows = await fetchAvailability(catalog.id, checkIn, checkOut);
      const map: Record<string, number> = {};
      rows.forEach((r) => {
        map[r.roomTypeId] = r.available;
      });
      setAvailability(map);

      const quoteMap: Record<string, number> = {};
      const candidates: RoomCandidate[] = [];

      await Promise.all(
        catalog.roomTypes
          .filter((rt) => (map[rt.id] ?? 0) > 0)
          .map(async (rt) => {
            const q = await fetchQuote(catalog.id, rt.id, checkIn, checkOut);
            quoteMap[rt.id] = q.totalAmount;
            candidates.push({
              roomTypeId: rt.id,
              name: rt.name,
              maxOccupancy: rt.maxOccupancy,
              available: map[rt.id] ?? 0,
              unitPrice: q.totalAmount,
            });
          }),
      );

      setQuotes(quoteMap);
      setMixSuggestions(
        totalGuests > 1 ? suggestRoomMixes(totalGuests, candidates) : [],
      );
      setHasSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tra cứu được phòng');
      setMixSuggestions([]);
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
    if (!catalog) return;
    void loadCalendar(catalog.id);
  }, [catalog, loadCalendar]);

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

  const setCartQuantity = useCallback(
    (roomTypeId: string, quantity: number) => {
      const rt = catalog?.roomTypes.find((r) => r.id === roomTypeId);
      if (!rt) return;
      const maxQ = availability[roomTypeId] ?? 0;
      const q = Math.max(0, Math.min(quantity, maxQ));
      const unitPrice = quotes[roomTypeId];
      if (q === 0) {
        setCartLines((prev) => prev.filter((l) => l.roomTypeId !== roomTypeId));
        return;
      }
      if (unitPrice == null) return;
      setCartLines((prev) => {
        const rest = prev.filter((l) => l.roomTypeId !== roomTypeId);
        return [
          ...rest,
          {
            roomTypeId,
            name: rt.name,
            quantity: q,
            maxOccupancy: rt.maxOccupancy,
            unitPrice,
          },
        ];
      });
    },
    [catalog, availability, quotes],
  );

  const applySuggestion = (s: RoomMixSuggestion) => {
    setCartLines(
      s.lines.map((l) => ({
        roomTypeId: l.roomTypeId,
        name: l.name,
        quantity: l.quantity,
        maxOccupancy: l.maxOccupancy,
        unitPrice: l.unitPrice,
      })),
    );
    setError(null);
  };

  const handleSelectSingleRoom = (roomTypeId: string) => {
    setCartQuantity(roomTypeId, 1);
    setStep('guest');
    setError(null);
  };

  const handleContinueFromCart = () => {
    if (cartCapacity(cartLines) < totalGuests) {
      setError(
        `Chưa đủ chỗ cho ${totalGuests} khách. Hãy thêm phòng hoặc chọn gợi ý phía trên.`,
      );
      return;
    }
    setStep('guest');
    setError(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalog || !checkIn || !checkOut || cartLines.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const partnerRef = readPartnerRef();
      const result = await checkoutGroup({
        propertyId: catalog.id,
        checkIn,
        checkOut,
        lines: cartLines.map((l) => ({
          roomTypeId: l.roomTypeId,
          quantity: l.quantity,
        })),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(partnerRef ? { partnerRef } : {}),
      });

      savePendingBooking(result.primaryBookingId, result.guest.phone);
      window.location.href = result.paymentUrl;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể hoàn tất đặt phòng',
      );
      setSubmitting(false);
    }
  };

  const cartQtyByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of cartLines) m[l.roomTypeId] = l.quantity;
    return m;
  }, [cartLines]);

  const cartTotal = cartLines.length ? cartTotalPrice(cartLines) : undefined;

  const singleRoomFitCount =
    catalog?.roomTypes.filter((rt) => {
      const avail = availability[rt.id] ?? 0;
      return avail > 0 && rt.maxOccupancy >= totalGuests;
    }).length ?? 0;

  const anyAvailCount =
    catalog?.roomTypes.filter((rt) => (availability[rt.id] ?? 0) > 0).length ??
    0;

  const stepSubtitle =
    step === 'browse'
      ? 'Chọn ngày và số khách — có thể đặt nhiều phòng, nhiều loại phòng trong một lần thanh toán.'
      : 'Nhập thông tin liên hệ và thanh toán một lần cho toàn bộ phòng trong đơn.';

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
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <MapPin className="h-4 w-4 shrink-0 text-mango-accent" />
          <span className="font-semibold text-white">{catalog.name}</span>
          {catalog.address && (
            <span className="hidden sm:inline">— {catalog.address}</span>
          )}
        </div>
      )}

      <BookingStepIndicator current={step} />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {step === 'browse' && catalog && (
        <div className="space-y-8 pb-32">
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
            <p className="text-sm text-white/60">
              {anyAvailCount > 0
                ? totalGuests > 2 && singleRoomFitCount === 0
                  ? `${anyAvailCount} loại phòng trống — gợi ý phối phòng cho ${totalGuests} khách bên dưới, hoặc tự thêm vào đơn.`
                  : `${anyAvailCount} loại phòng trống · ${checkIn} → ${checkOut} · ${totalGuests} khách`
                : 'Không có phòng trống — thử đổi ngày.'}
            </p>
          )}

          {(totalGuests > 1 || cartLines.length > 0) && hasSearched && (
            <RoomMixSuggestions
              guests={totalGuests}
              loading={searching}
              suggestions={mixSuggestions}
              onApply={applySuggestion}
            />
          )}

          <div className="space-y-6">
            {[...catalog.roomTypes]
              .sort((a, b) => {
                const rank = (rt: (typeof catalog.roomTypes)[0]) => {
                  const avail = availability[rt.id] ?? 0;
                  if (avail <= 0) return 0;
                  return 2;
                };
                return rank(b) - rank(a);
              })
              .map((rt) => {
                const avail = availability[rt.id] ?? 0;
                const soldOut = !hasSearched || avail <= 0;
                const capacityExceeded =
                  hasSearched && avail > 0 && rt.maxOccupancy < totalGuests;
                const cartQ = cartQtyByType[rt.id] ?? 0;

                return (
                  <RoomTypeBookingCard
                    key={rt.id}
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
                    selected={false}
                    cartQuantity={cartQ}
                    maxCartQuantity={avail}
                    onSelect={() => handleSelectSingleRoom(rt.id)}
                    onAddToCart={() => setCartQuantity(rt.id, 1)}
                    onCartQuantityChange={(q) => setCartQuantity(rt.id, q)}
                    availabilityByDate={calendarByRoomType[rt.id] ?? {}}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    calendarLoading={calendarLoading}
                  />
                );
              })}
          </div>

          <BookingRoomCart
            lines={cartLines}
            totalGuests={totalGuests}
            onChangeQuantity={setCartQuantity}
            onContinue={handleContinueFromCart}
          />
        </div>
      )}

      {step === 'guest' && cartLines.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-5">
          <form
            onSubmit={handleConfirmBooking}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-mango-navy-900/80 dark:to-mango-navy-950/80 dark:backdrop-blur lg:col-span-3 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setStep('browse')}
              className="mb-4 flex items-center gap-1 text-sm font-semibold text-mango-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại chọn phòng
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Thông tin khách đặt phòng
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-white/60">
              Một lần thanh toán VNPay cho {cartLines.reduce((s, l) => s + l.quantity, 0)}{' '}
              phòng. Dùng đúng số điện thoại để vào My Stay.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-mango-accent">
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-mango-accent">
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-mango-accent">
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
                  Đang giữ phòng & tạo thanh toán...
                </>
              ) : (
                'Xác nhận & thanh toán VNPay'
              )}
            </button>
          </form>

          <BookingSummaryAside
            lines={cartLines}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            children={children}
            totalAmount={cartTotal}
          />
        </div>
      )}
    </BookPageShell>
  );
}
