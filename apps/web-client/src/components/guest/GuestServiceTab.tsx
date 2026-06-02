import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  Send,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { panelCard } from '../../lib/theme-classes';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  currency: string;
}

export interface ServiceRequestRow {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  status: 'POSTED' | 'VOID';
  serviceName: string | null;
  category: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Ăn uống',
  LAUNDRY: 'Giặt ủi',
  MINIBAR: 'Mini bar',
  TRANSPORT: 'Đưa đón',
  OTHER: 'Khác',
};

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

interface GuestServiceTabProps {
  token: string;
  bookingStatus: string;
}

export function GuestServiceTab({ token, bookingStatus }: GuestServiceTabProps) {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [serviceItemId, setServiceItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, reqRes] = await Promise.all([
        fetch('/api/v1/guest/me/service-items', { headers }),
        fetch('/api/v1/guest/me/service-requests', { headers }),
      ]);
      if (catRes.ok) setCatalog(await catRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
      if (!catRes.ok && catRes.status !== 400) {
        setError('Không tải được danh mục dịch vụ.');
      }
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingStatus === 'CHECKED_IN') {
      void loadData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, bookingStatus]);

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => c.category));
    return ['ALL', ...Array.from(set).sort()];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    if (categoryFilter === 'ALL') return catalog;
    return catalog.filter((c) => c.category === categoryFilter);
  }, [catalog, categoryFilter]);

  const selectedItem = catalog.find((c) => c.id === serviceItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceItemId) {
      setError('Vui lòng chọn dịch vụ.');
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/v1/guest/me/service-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceItemId,
          quantity,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Không gửi được yêu cầu.',
        );
        return;
      }
      setSuccess(true);
      setNote('');
      setQuantity(1);
      setRequests((prev) => {
        if (prev.some((r) => r.id === data.id)) return prev;
        return [data, ...prev];
      });
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingStatus !== 'CHECKED_IN') {
    return (
      <div className={`${panelCard} p-8 text-center`}>
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Dịch vụ phòng chưa mở
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-white/60">
          {bookingStatus === 'CONFIRMED'
            ? 'Bạn cần check-in tại quầy lễ tân (CCCD/Hộ chiếu) trước khi gửi yêu cầu dịch vụ.'
            : 'Yêu cầu dịch vụ chỉ khả dụng trong thời gian đang lưu trú.'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-mango-accent" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className={`${panelCard} space-y-6 p-6`}>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Gửi yêu cầu dịch vụ
          </h2>
          <p className="text-sm text-slate-600 dark:text-white/60">
            Chọn từ danh mục khách sạn — nhân viên sẽ phục vụ tới phòng bạn
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Sparkles className="h-5 w-5 shrink-0" />
            <span>Đã gửi yêu cầu thành công!</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-mango-accent">
              Nhóm dịch vụ
            </label>
            <select
              className="field-select w-full"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setServiceItemId('');
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'Tất cả' : CATEGORY_LABELS[cat] ?? cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-mango-accent">
              Dịch vụ
            </label>
            <select
              className="field-select w-full"
              value={serviceItemId}
              onChange={(e) => setServiceItemId(e.target.value)}
              required
            >
              <option value="">— Chọn dịch vụ —</option>
              {filteredCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.unitPrice > 0
                    ? ` · ${formatVnd(item.unitPrice)}/${item.unit}`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && selectedItem.unitPrice > 0 && (
            <p className="text-xs text-slate-500 dark:text-white/50">
              Đơn giá: {formatVnd(selectedItem.unitPrice)} / {selectedItem.unit}
            </p>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-mango-accent">
              Số lượng
            </label>
            <input
              type="number"
              min={1}
              className="field-input w-full"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60">
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              className="field-textarea w-full"
              placeholder="VD: Giao trước 14h, thêm 2 khăn tắm..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !serviceItemId}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-mango-accent py-3 font-bold text-mango-navy-950 shadow-md transition hover:bg-mango-accent-light disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>

      <div
        className={`lg:col-span-2 ${panelCard} space-y-6 p-6`}
      >
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-mango-accent" />
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Yêu cầu đã gửi
            </h2>
            <p className="text-sm text-slate-600 dark:text-white/60">
              Các khoản sẽ được cộng vào hoá đơn khi check-out
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HelpCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Bạn chưa gửi yêu cầu dịch vụ nào.</p>
          </div>
        ) : (
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {requests.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {row.serviceName || row.description}
                    </p>
                    {row.serviceName && row.description !== row.serviceName && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                        {row.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(row.createdAt).toLocaleString('vi-VN')} · SL{' '}
                      {row.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                        row.status === 'VOID'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {row.status === 'VOID' ? 'Đã huỷ' : 'Đã ghi nhận'}
                    </span>
                    {row.amount > 0 && (
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                        {formatVnd(row.amount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
