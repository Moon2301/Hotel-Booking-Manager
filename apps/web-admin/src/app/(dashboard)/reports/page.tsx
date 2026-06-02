'use client';

import { usePropertySelection } from '@/providers/property-selection-provider';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { Property } from '@/types';
import { formatDateOnlyVi } from '@/lib/format-date';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

const PIE_COLORS = [
  '#14b8a6',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#22c55e',
  '#ef4444',
  '#0ea5e9',
];

const BAR_ACTIVE = '#059669';
const BAR_DEFAULT = '#10b981';

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

function shortDateLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return format(d, 'dd/MM');
}

interface DailyRow {
  date: string;
  revenue: number;
  roomsBooked: number;
}

interface DailyDetail {
  date: string;
  summary: {
    totalRevenue: number;
    roomRevenue: number;
    serviceRevenue: number;
    roomsBooked: number;
  };
  byRoomType: Array<{
    roomTypeId: string;
    roomTypeName: string;
    roomsBooked: number;
    roomRevenue: number;
    sharePercent: number;
  }>;
  serviceCharges: Array<{
    id: string;
    description: string;
    quantity: number;
    amount: number;
    createdAt: string;
  }>;
}

interface RoomTypeMix {
  date: string;
  totalRoomsBooked: number;
  items: Array<{
    roomTypeId: string;
    roomTypeName: string;
    roomsBooked: number;
    sharePercent: number;
  }>;
}

export default function ReportsPage() {
  const { selectedPropertyId, setSelectedPropertyId } = usePropertySelection();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const end = format(new Date(), 'yyyy-MM-dd');
    const start = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    setEndDate(end);
    setStartDate(start);
  }, []);

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => get<Property[]>('/properties'),
  });

  const { data: performance } = useQuery({
    queryKey: ['reports', 'performance', selectedPropertyId, startDate, endDate],
    queryFn: () =>
      get<{
        metrics: {
          totalRevenue: number;
          occupiedRoomNights: number;
          occupancyRate: number;
        };
      }>(
        `/reports/performance?propertyId=${selectedPropertyId}&startDate=${startDate}&endDate=${endDate}`,
      ),
    enabled: !!selectedPropertyId && !!startDate && !!endDate,
  });

  const { data: dailyRows } = useQuery({
    queryKey: ['reports', 'chart', selectedPropertyId, startDate, endDate],
    queryFn: () =>
      get<DailyRow[]>(
        `/reports/daily-chart?propertyId=${selectedPropertyId}&startDate=${startDate}&endDate=${endDate}`,
      ),
    enabled: !!selectedPropertyId && !!startDate && !!endDate,
  });

  useEffect(() => {
    if (!dailyRows?.length) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate((prev) => {
      if (prev && dailyRows.some((r) => r.date === prev)) return prev;
      return dailyRows[dailyRows.length - 1]?.date ?? null;
    });
  }, [dailyRows]);

  const { data: dailyDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['reports', 'daily-detail', selectedPropertyId, selectedDate],
    queryFn: () =>
      get<DailyDetail>(
        `/reports/daily-detail?propertyId=${selectedPropertyId}&date=${selectedDate}`,
      ),
    enabled: !!selectedPropertyId && !!selectedDate,
  });

  const { data: roomTypeMix } = useQuery({
    queryKey: ['reports', 'room-type-mix', selectedPropertyId, selectedDate],
    queryFn: () =>
      get<RoomTypeMix>(
        `/reports/room-type-mix?propertyId=${selectedPropertyId}&date=${selectedDate}`,
      ),
    enabled: !!selectedPropertyId && !!selectedDate,
  });

  const chartData = useMemo(
    () =>
      (dailyRows ?? []).map((row) => ({
        ...row,
        label: shortDateLabel(row.date),
      })),
    [dailyRows],
  );

  const pieData =
    roomTypeMix?.items.map((i) => ({
      name: i.roomTypeName,
      value: i.roomsBooked,
      sharePercent: i.sharePercent,
    })) ?? [];

  const handleBarClick = (payload: DailyRow & { label?: string }) => {
    if (payload?.date) setSelectedDate(payload.date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Báo cáo doanh thu</h1>
        <p className="text-sm text-muted-foreground">
          Biểu đồ doanh thu theo ngày — bấm cột để xem chi tiết
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full max-w-sm">
          <Label className="mb-1.5 block text-xs font-medium">Cơ sở</Label>
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
        <div>
          <Label htmlFor="report-start" className="mb-1.5 block text-xs font-medium">
            Từ ngày
          </Label>
          <Input
            id="report-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div>
          <Label htmlFor="report-end" className="mb-1.5 block text-xs font-medium">
            Đến ngày
          </Label>
          <Input
            id="report-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      {!selectedPropertyId ? (
        <p className="text-muted-foreground">Vui lòng chọn cơ sở để xem báo cáo.</p>
      ) : (
        <>
          {performance && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng doanh thu (kỳ đã chọn)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatVnd(performance.metrics.totalRevenue)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng phòng đã bán (đêm phòng)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performance.metrics.occupiedRoomNights}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Công suất trung bình
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performance.metrics.occupancyRate}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Doanh thu theo ngày</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bấm vào cột ngày để xem chi tiết bên dưới
                {selectedDate ? (
                  <>
                    {' '}
                    · Đang chọn:{' '}
                    <span className="font-semibold text-foreground">
                      {formatDateOnlyVi(selectedDate)}
                    </span>
                  </>
                ) : null}
              </p>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={chartData.length > 10 ? -35 : 0}
                        textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                        height={chartData.length > 10 ? 56 : 30}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(0)}M`
                            : v >= 1_000
                              ? `${(v / 1_000).toFixed(0)}K`
                              : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [formatVnd(value), 'Doanh thu']}
                        labelFormatter={(_, payload) => {
                          const row = payload?.[0]?.payload as DailyRow | undefined;
                          return row?.date
                            ? formatDateOnlyVi(row.date)
                            : '';
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu"
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(_, index) => {
                          const row = chartData[index];
                          if (row) handleBarClick(row);
                        }}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.date}
                            fill={
                              entry.date === selectedDate ? BAR_ACTIVE : BAR_DEFAULT
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  Không có dữ liệu trong khoảng thời gian này.
                </p>
              )}
            </CardContent>
          </Card>

          {selectedDate && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Chi tiết — {formatDateOnlyVi(selectedDate)}
              </h2>

              {detailLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải chi tiết...</p>
              ) : dailyDetail ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="lg:col-span-2">
                    <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
                        <p className="mt-1 text-xl font-bold text-emerald-600">
                          {formatVnd(dailyDetail.summary.totalRevenue)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">Tiền phòng</p>
                        <p className="mt-1 text-xl font-bold">
                          {formatVnd(dailyDetail.summary.roomRevenue)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">Phát sinh dịch vụ</p>
                        <p className="mt-1 text-xl font-bold">
                          {formatVnd(dailyDetail.summary.serviceRevenue)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">Đêm phòng</p>
                        <p className="mt-1 text-xl font-bold">
                          {dailyDetail.summary.roomsBooked}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Doanh thu theo loại phòng
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dailyDetail.byRoomType.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                              <tr className="border-b">
                                <th className="py-2 text-left">Loại phòng</th>
                                <th className="py-2 text-right">Đêm</th>
                                <th className="py-2 text-right">Doanh thu</th>
                                <th className="py-2 text-right">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dailyDetail.byRoomType.map((row) => (
                                <tr key={row.roomTypeId} className="border-b">
                                  <td className="py-2.5 font-medium">
                                    {row.roomTypeName}
                                  </td>
                                  <td className="py-2.5 text-right tabular-nums">
                                    {row.roomsBooked}
                                  </td>
                                  <td className="py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                                    {formatVnd(row.roomRevenue)}
                                  </td>
                                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                                    {row.sharePercent}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="py-6 text-center text-muted-foreground text-sm">
                          Không có doanh thu phòng trong ngày này.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Tỷ lệ phòng theo loại
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {roomTypeMix?.totalRoomsBooked ?? 0} phòng trong ngày
                      </p>
                    </CardHeader>
                    <CardContent className="min-h-[300px]">
                      {pieData.length > 0 ? (
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart
                              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            >
                              <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="38%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={72}
                                paddingAngle={2}
                                isAnimationActive={false}
                              >
                                {pieData.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, name: string) => [
                                  `${value} phòng`,
                                  name,
                                ]}
                              />
                              <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{
                                  fontSize: 12,
                                  lineHeight: '22px',
                                  paddingLeft: 8,
                                  maxWidth: '52%',
                                }}
                                formatter={(value, entry) => {
                                  const pct =
                                    (
                                      entry?.payload as {
                                        sharePercent?: number;
                                      }
                                    )?.sharePercent ?? 0;
                                  const label = String(value);
                                  const short =
                                    label.length > 24
                                      ? `${label.slice(0, 22)}…`
                                      : label;
                                  return `${short} · ${pct}%`;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Chưa có phòng trong ngày này.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {dailyDetail.serviceCharges.length > 0 && (
                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Phát sinh dịch vụ trong ngày
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase text-muted-foreground">
                            <tr className="border-b">
                              <th className="py-2 text-left">Mô tả</th>
                              <th className="py-2 text-right">SL</th>
                              <th className="py-2 text-right">Số tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyDetail.serviceCharges.map((c) => (
                              <tr key={c.id} className="border-b">
                                <td className="py-2.5">{c.description}</td>
                                <td className="py-2.5 text-right tabular-nums">
                                  {c.quantity}
                                </td>
                                <td className="py-2.5 text-right font-semibold tabular-nums">
                                  {formatVnd(c.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
