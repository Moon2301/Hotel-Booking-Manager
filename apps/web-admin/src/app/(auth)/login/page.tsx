import { Building2 } from 'lucide-react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-lg md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-8 text-primary-foreground md:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-6 w-6" />
          Hotel Admin
        </div>
        <div>
          <p className="text-sm text-primary-foreground/80">
            Hệ thống quản trị
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-snug">
            Điều hành khách sạn tập trung
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/75">
            Property, phòng, booking và thanh toán — một bảng điều khiển cho
            toàn bộ đội vận hành.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Hotel Booking Manager · Web Admin
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
