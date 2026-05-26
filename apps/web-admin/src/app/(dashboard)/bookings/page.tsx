'use client';

import { usePropertySelection } from '@/providers/property-selection-provider';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { Property } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingsQueueTable } from '@/components/bookings/BookingsQueueTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Timer, AlertCircle } from 'lucide-react';
import { useEffect, useState as useReactState } from 'react';
import { useMounted } from '@/hooks/use-mounted';

function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const mounted = useMounted();
  const [timeLeft, setTimeLeft] = useReactState('');

  useEffect(() => {
    if (!mounted) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Đã hết hạn');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}p ${s < 10 ? '0' : ''}${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, mounted]);

  if (!mounted) {
    return (
      <span className="font-mono font-bold text-amber-600" suppressHydrationWarning>
        …
      </span>
    );
  }

  return (
    <span
      className={`font-mono font-bold ${timeLeft === 'Đã hết hạn' ? 'text-destructive' : 'text-amber-600'}`}
      suppressHydrationWarning
    >
      {timeLeft}
    </span>
  );
}

export default function BookingsPage() {
  const { selectedPropertyId, setSelectedPropertyId } = usePropertySelection();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => get<Property[]>('/properties'),
  });

  const { data: holds, isLoading: holdsLoading } = useQuery({
    queryKey: ['holds', selectedPropertyId],
    queryFn: () => get<any[]>(`/holds?propertyId=${selectedPropertyId}`),
    enabled: !!selectedPropertyId,
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý Đặt phòng & Giữ chỗ</h1>
      </div>

      <div className="w-full max-w-sm">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn cơ sở" />
          </SelectTrigger>
          <SelectContent>
            {properties?.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPropertyId && (
        <p className="text-muted-foreground">Vui lòng chọn cơ sở để xem dữ liệu.</p>
      )}

      {selectedPropertyId && (
        <Tabs defaultValue="paid" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="paid">Đã thanh toán (PAID)</TabsTrigger>
            <TabsTrigger value="pending">Chờ thanh toán (PENDING)</TabsTrigger>
            <TabsTrigger value="holds" className="gap-2">
              <Timer className="h-4 w-4" />
              Monitor Giữ chỗ (Holds)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paid">
            <BookingsQueueTable propertyId={selectedPropertyId} mode="paid" />
          </TabsContent>

          <TabsContent value="pending">
            <BookingsQueueTable propertyId={selectedPropertyId} mode="pending" />
          </TabsContent>

          <TabsContent value="holds">
            {holdsLoading && <p>Đang tải holds...</p>}
            {!holdsLoading && holds && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {holds.map((hold) => (
                  <Card key={hold.id} className="border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm">
                          Hold ID: {hold.id.split('-')[0]}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-amber-100 text-amber-800 border-amber-200"
                        >
                          Đang giữ chỗ
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-slate-600 mb-3 space-y-1">
                        <p>
                          <strong>Loại phòng:</strong>{' '}
                          {hold.roomType?.name || hold.roomTypeId}
                        </p>
                        <p>
                          <strong>Ngày:</strong> {hold.nights.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-100 shadow-sm">
                        <Timer className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          Còn lại:
                        </span>
                        <HoldCountdown expiresAt={hold.expiresAt} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {holds.length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>Hiện không có phòng nào đang được giữ chỗ.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
