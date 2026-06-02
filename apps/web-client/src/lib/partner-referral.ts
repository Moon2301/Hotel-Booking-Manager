const STORAGE_KEY = 'mango_partner_ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredRef = {
  code: string;
  savedAt: number;
};

function normalizeRef(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  if (!code) return null;
  if (!/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/.test(code)) {
    return null;
  }
  return code;
}

export function readPartnerRef(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed?.code || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function savePartnerRef(code: string): void {
  const normalized = normalizeRef(code);
  if (!normalized) return;
  const payload: StoredRef = { code: normalized, savedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/** Lưu mã từ ?ref= trên URL (trang chủ hoặc bất kỳ route nào). */
export function capturePartnerRefFromSearch(search: string): void {
  const params = new URLSearchParams(search);
  const ref = params.get('ref') ?? params.get('partner');
  if (ref) savePartnerRef(ref);
}

export function clearPartnerRef(): void {
  localStorage.removeItem(STORAGE_KEY);
}
