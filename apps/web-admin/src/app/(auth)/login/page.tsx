'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2 } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setServerError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(
          result.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
        );
        return;
      }

      setUser(result.user);
      router.push('/');
      router.refresh();
    } catch {
      setServerError('Không thể kết nối đến server. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }

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

      <Card className="border-0 shadow-none">
        <CardHeader className="text-center md:text-left">
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>
            Nhập tài khoản nhân viên được cấp quyền
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@hotel.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
