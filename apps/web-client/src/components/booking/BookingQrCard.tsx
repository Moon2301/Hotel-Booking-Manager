import { QRCodeCanvas } from 'qrcode.react';

type Props = {
  /** JSON booking reference or JWT check-in token */
  value: string;
  title?: string;
  hint?: string;
  size?: number;
};

export function BookingQrCard({
  value,
  title = 'Mã QR đặt phòng',
  hint = 'Quét tại quầy lễ tân (kèm CCCD/Hộ chiếu) để tra cứu booking.',
  size = 180,
}: Props) {
  if (!value?.trim()) return null;

  return (
    <div className="rounded-2xl border border-mango-accent/30 bg-white p-6 text-center shadow-sm dark:border-mango-accent/40 dark:bg-mango-navy-900/80">
      <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mb-4 text-xs text-slate-600 dark:text-white/60">{hint}</p>
      <div className="mx-auto inline-block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <QRCodeCanvas value={value} size={size} level="H" includeMargin />
      </div>
    </div>
  );
}
