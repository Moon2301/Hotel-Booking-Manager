'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { usePropertySelection } from '@/providers/property-selection-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { get } from '@/lib/api-client';
import { getRoomTypes, updateRoomType } from '@/lib/api/room-types';
import { bulkUpdateDailyRates, listDailyRates } from '@/lib/api/rates';
import { toast } from '@/hooks/use-toast';
import type { Property, RoomType } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DEFAULT_DAYS = 14;

function moneyVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

function cellKey(roomTypeId: string, night: string) {
  return `${roomTypeId}|${night}`;
}

function nightsInRange(from: string, dayCount: number): string[] {
  const nights: string[] = [];
  let cur = parseISO(from);
  for (let i = 0; i < dayCount; i++) {
    nights.push(format(cur, 'yyyy-MM-dd'));
    cur = addDays(cur, 1);
  }
  return nights;
}

function shortNightLabel(night: string) {
  return format(parseISO(night), 'dd/MM');
}

export default function RoomRatesPage() {
  const { selectedPropertyId, setSelectedPropertyId } = usePropertySelection();
  const { can } = usePermissions();
  const canEdit = can('rates:write');
  const queryClient = useQueryClient();

  const [fromDate, setFromDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [dayCount, setDayCount] = useState(DEFAULT_DAYS);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [baseEdits, setBaseEdits] = useState<Record<string, string>>({});

  const nights = useMemo(
    () => nightsInRange(fromDate, dayCount),
    [fromDate, dayCount],
  );
  const toDate = nights[nights.length - 1] ?? fromDate;

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => get<Property[]>('/properties'),
  });

  const { data: roomTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['room-types', selectedPropertyId],
    queryFn: () => getRoomTypes(selectedPropertyId),
    enabled: !!selectedPropertyId,
  });

  const { data: dailyRates = [], isLoading: ratesLoading, refetch } = useQuery({
    queryKey: ['daily-rates', selectedPropertyId, fromDate, toDate],
    queryFn: () => listDailyRates(selectedPropertyId, fromDate, toDate),
    enabled: !!selectedPropertyId && nights.length > 0,
  });

  const rateMap = useMemo(() => {
    const map: Record<string, number> = {};
    dailyRates.forEach((r) => {
      map[cellKey(r.roomTypeId, r.night)] = Number(r.amount);
    });
    return map;
  }, [dailyRates]);

  const roomTypesSeed = useMemo(
    () =>
      roomTypes
        .map((rt) => `${rt.id}:${Number(rt.basePrice)}`)
        .sort()
        .join('|'),
    [roomTypes],
  );

  const resetScopeRef = useRef('');
  const resetScope = `${selectedPropertyId}|${fromDate}|${dayCount}`;

  useEffect(() => {
    if (resetScopeRef.current === resetScope) return;
    resetScopeRef.current = resetScope;
    setEdits({});
  }, [resetScope]);

  useEffect(() => {
    if (!roomTypes.length) {
      setBaseEdits({});
      return;
    }
    const bases: Record<string, string> = {};
    for (const rt of roomTypes) {
      bases[rt.id] = String(Number(rt.basePrice));
    }
    setBaseEdits(bases);
  }, [roomTypesSeed, selectedPropertyId]);

  const propertySelectValue = useMemo(() => {
    if (!selectedPropertyId) return undefined;
    if (properties?.some((p) => p.id === selectedPropertyId)) {
      return selectedPropertyId;
    }
    return undefined;
  }, [selectedPropertyId, properties]);

  const getAmount = (rt: RoomType, night: string) => {
    const key = cellKey(rt.id, night);
    if (edits[key] !== undefined) return edits[key];
    if (rateMap[key] !== undefined) return rateMap[key];
    return Number(rt.basePrice);
  };

  const setCell = (roomTypeId: string, night: string, value: number) => {
    const key = cellKey(roomTypeId, night);
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const saveRatesMutation = useMutation({
    mutationFn: async () => {
      const rates: { roomTypeId: string; night: string; amount: number }[] =
        [];
      for (const rt of roomTypes) {
        for (const night of nights) {
          const key = cellKey(rt.id, night);
          if (edits[key] !== undefined) {
            rates.push({
              roomTypeId: rt.id,
              night,
              amount: edits[key],
            });
          }
        }
      }
      if (!rates.length) {
        throw new Error('Chưa có thay đổi giá theo ngày để lưu');
      }
      return bulkUpdateDailyRates(selectedPropertyId, rates);
    },
    onSuccess: async () => {
      toast({ title: 'Đã lưu giá theo ngày' });
      setEdits({});
      await queryClient.invalidateQueries({
        queryKey: ['daily-rates', selectedPropertyId],
      });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Không lưu được',
        description: err.message,
      });
    },
  });

  const saveBaseMutation = useMutation({
    mutationFn: async () => {
      for (const rt of roomTypes) {
        const raw = baseEdits[rt.id];
        const basePrice = Number(raw);
        if (!Number.isFinite(basePrice) || basePrice < 0) {
          throw new Error(`Giá gốc không hợp lệ: ${rt.name}`);
        }
        if (basePrice !== Number(rt.basePrice)) {
          await updateRoomType(selectedPropertyId, rt.id, { basePrice });
        }
      }
    },
    onSuccess: async () => {
      toast({ title: 'Đã cập nhật giá gốc loại phòng' });
      await queryClient.invalidateQueries({
        queryKey: ['room-types', selectedPropertyId],
      });
      await refetch();
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: err.message,
      });
    },
  });

  const applyBaseToVisibleRange = () => {
    const next: Record<string, number> = { ...edits };
    for (const rt of roomTypes) {
      const base = Number(baseEdits[rt.id] ?? rt.basePrice);
      for (const night of nights) {
        next[cellKey(rt.id, night)] = base;
      }
    }
    setEdits(next);
    toast({
      title: 'Đã điền giá gốc vào lưới',
      description: 'Bấm Lưu giá theo ngày để ghi vào hệ thống.',
    });
  };

  const hasEdits = Object.keys(edits).length > 0;
  const loading = typesLoading || ratesLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Giá phòng theo ngày</h1>
          <p className="text-sm text-muted-foreground">
            Chỉnh giá gốc loại phòng và giá từng đêm — áp dụng cho đặt phòng
            trực tuyến.
          </p>
        </div>
        {canEdit && hasEdits && (
          <Button
            onClick={() => saveRatesMutation.mutate()}
            disabled={saveRatesMutation.isPending}
          >
            {saveRatesMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu giá theo ngày ({Object.keys(edits).length} ô)
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-xs">
          <Label className="mb-1.5 block text-xs">Cơ sở</Label>
          <Select
            value={propertySelectValue}
            onValueChange={setSelectedPropertyId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn cơ sở" />
            </SelectTrigger>
            <SelectContent>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rate-from" className="mb-1.5 block text-xs">
            Từ ngày
          </Label>
          <Input
            id="rate-from"
            type="date"
            className="w-[160px]"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="rate-days" className="mb-1.5 block text-xs">
            Số ngày hiển thị
          </Label>
          <Input
            id="rate-days"
            type="number"
            min={7}
            max={31}
            className="w-[100px]"
            value={dayCount}
            onChange={(e) =>
              setDayCount(Math.min(31, Math.max(7, Number(e.target.value) || 7)))
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={!selectedPropertyId}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tải lại
        </Button>
      </div>

      {!selectedPropertyId ? (
        <p className="text-muted-foreground">Chọn cơ sở để chỉnh giá.</p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Giá gốc (mặc định)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Dùng khi chưa có giá riêng cho một đêm. Cập nhật trước khi điền
                hàng loạt.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roomTypes.map((rt) => (
                  <div
                    key={rt.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium">{rt.name}</span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      className="h-9 w-[140px] text-right tabular-nums"
                      disabled={!canEdit}
                      value={baseEdits[rt.id] ?? String(rt.basePrice)}
                      onChange={(e) =>
                        setBaseEdits((prev) => ({
                          ...prev,
                          [rt.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => saveBaseMutation.mutate()}
                    disabled={saveBaseMutation.isPending}
                  >
                    Lưu giá gốc
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyBaseToVisibleRange}
                  >
                    Điền giá gốc vào {dayCount} ngày
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Lưới giá {format(parseISO(fromDate), 'dd/MM/yyyy')} →{' '}
                {format(parseISO(toDate), 'dd/MM/yyyy')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ô có viền xanh = đã chỉnh chưa lưu. Ô in đậm = đã có giá riêng
                trong DB.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : roomTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có loại phòng — thêm trong Properties.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 min-w-[160px] bg-background">
                        Loại phòng
                      </TableHead>
                      {nights.map((night) => (
                        <TableHead
                          key={night}
                          className="min-w-[88px] text-center text-xs"
                        >
                          {shortNightLabel(night)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomTypes.map((rt) => (
                      <TableRow key={rt.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium">
                          <div>{rt.name}</div>
                          <div className="text-xs text-muted-foreground">
                            gốc {moneyVnd(Number(rt.basePrice))}
                          </div>
                        </TableCell>
                        {nights.map((night) => {
                          const key = cellKey(rt.id, night);
                          const amount = getAmount(rt, night);
                          const isOverride = rateMap[key] !== undefined;
                          const isDirty = edits[key] !== undefined;
                          return (
                            <TableCell key={night} className="p-1">
                              <Input
                                type="number"
                                min={0}
                                step={1000}
                                disabled={!canEdit}
                                className={`h-9 w-[84px] px-1 text-center text-xs tabular-nums ${
                                  isDirty
                                    ? 'border-primary ring-1 ring-primary/30'
                                    : isOverride
                                      ? 'font-semibold'
                                      : ''
                                }`}
                                value={String(amount)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '') return;
                                  const v = Number(raw);
                                  if (Number.isFinite(v) && v >= 0) {
                                    setCell(rt.id, night, v);
                                  }
                                }}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
