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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  const { selectedPropertyId, setSelectedPropertyId } = usePropertySelection();
  
  // Last 7 days default range
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => get<Property[]>('/properties'),
  });

  const { data: performance } = useQuery({
    queryKey: ['reports', 'performance', selectedPropertyId, startDate, endDate],
    queryFn: () => get<any>(`/reports/performance?propertyId=${selectedPropertyId}&startDate=${startDate}&endDate=${endDate}`),
    enabled: !!selectedPropertyId,
  });

  const { data: chartData } = useQuery({
    queryKey: ['reports', 'chart', selectedPropertyId, startDate, endDate],
    queryFn: () => get<any[]>(`/reports/daily-chart?propertyId=${selectedPropertyId}&startDate=${startDate}&endDate=${endDate}`),
    enabled: !!selectedPropertyId,
  });

  const { data: tickets } = useQuery({
    queryKey: ['reconciliation', selectedPropertyId],
    queryFn: () => get<any[]>(`/reconciliation-tickets?propertyId=${selectedPropertyId}`),
    enabled: !!selectedPropertyId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Báo cáo & Đối soát Doanh thu</h1>
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

      {!selectedPropertyId ? (
        <p className="text-muted-foreground">Vui lòng chọn cơ sở để xem báo cáo.</p>
      ) : (
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="performance">Báo cáo ADR & Occupancy</TabsTrigger>
            <TabsTrigger value="reconciliation">Đối soát Cổng thanh toán</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            {performance && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">ADR (Giá phòng trung bình)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(performance.metrics.adr)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Công suất phòng (Occupancy)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.metrics.occupancyRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Tổng doanh thu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(performance.metrics.totalRevenue)}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {chartData && (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Xu hướng Doanh thu & ADR</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{fontSize: 12}} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{fontSize: 12}} />
                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10b981" strokeWidth={3} />
                        <Line yAxisId="right" type="monotone" dataKey="adr" name="ADR" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Công suất phòng theo ngày</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis tickFormatter={(v) => `${v}%`} tick={{fontSize: 12}} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="occupancy" name="Occupancy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reconciliation">
            <Card>
              <CardHeader>
                <CardTitle>Vé Đối soát (Reconciliation Tickets)</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets && tickets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                          <th className="px-4 py-3">Mã Đơn</th>
                          <th className="px-4 py-3">Ngày GD</th>
                          <th className="px-4 py-3 text-right">Hệ thống</th>
                          <th className="px-4 py-3 text-right">Gateway</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map(t => (
                          <tr key={t.id} className="border-b">
                            <td className="px-4 py-3 font-mono">{t.invoiceId.split('-')[0]}</td>
                            <td className="px-4 py-3">{formatDateOnlyVi(t.transactionDate)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{new Intl.NumberFormat('vi-VN').format(t.systemAmount)}đ</td>
                            <td className="px-4 py-3 text-right font-semibold text-rose-600">{t.gatewayAmount ? new Intl.NumberFormat('vi-VN').format(t.gatewayAmount) + 'đ' : 'N/A'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={t.status === 'MATCHED' ? 'default' : t.status === 'UNRESOLVED' ? 'destructive' : 'secondary'}>
                                {t.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={t.notes}>{t.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Không có dữ liệu đối soát lệch.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
