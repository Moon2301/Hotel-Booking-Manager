'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Receipt, 
  CreditCard, 
  User, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign
} from 'lucide-react';

import { useInvoices, useConfirmPayment, invoiceKeys } from '@/hooks/queries/use-invoices';
import { PaymentStatus, PaymentMethod } from '@/types';
import type { Invoice } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatInTimezone } from '@/lib/timezone';

const statusMap: Record<PaymentStatus, { label: string; color: string }> = {
  [PaymentStatus.PENDING]: { label: 'Chưa thanh toán', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  [PaymentStatus.AUTHORISED]: { label: 'Ủy quyền', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  [PaymentStatus.PAID]: { label: 'Đã thanh toán', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  [PaymentStatus.REFUNDED]: { label: 'Hoàn tiền', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  [PaymentStatus.FAILED]: { label: 'Thất bại', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
};

const methodMap: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Tiền mặt',
  [PaymentMethod.CARD]: 'Thẻ/POS',
  [PaymentMethod.VNPAY]: 'VNPay Online',
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading, isError, error } = useInvoices();
  const confirmPaymentMutation = useConfirmPayment();

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Manual payment modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

  const handleOpenConfirmDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentMethod('CASH');
    setDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice) return;
    
    confirmPaymentMutation.mutate({
      id: selectedInvoice.id,
      method: paymentMethod
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedInvoice(null);
      }
    });
  };

  // Filter invoices client-side for fast interaction
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.bookingId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4 animate-bounce" />
        <p className="text-destructive font-semibold">Không thể tải danh sách hoá đơn.</p>
        <p className="text-slate-400 text-sm mt-1">{error instanceof Error ? error.message : 'Lỗi không xác định'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quản Lý Hoá Đơn (Invoices)</h1>
          <p className="text-slate-500 text-sm mt-1">Lập hóa đơn và xác nhận thanh toán trực tiếp tại quầy lễ tân.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: invoiceKeys.all })} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      {/* Cards stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Hoá đơn chưa thanh toán</CardDescription>
            <CardTitle className="text-3xl font-black text-amber-500">
              {invoices.filter(i => i.paymentStatus === PaymentStatus.PENDING).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Đã thanh toán (Tháng này)</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-500">
              {invoices.filter(i => i.paymentStatus === PaymentStatus.PAID).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng số hoá đơn</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-800">{invoices.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Tìm theo mã hoá đơn hoặc mã đặt phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Label className="text-sm font-semibold shrink-0 text-slate-500">Bộ lọc trạng thái:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value={PaymentStatus.PENDING}>Chưa thanh toán</SelectItem>
              <SelectItem value={PaymentStatus.PAID}>Đã thanh toán</SelectItem>
              <SelectItem value={PaymentStatus.FAILED}>Thất bại</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4 text-sm font-semibold">Đang tải danh sách hoá đơn...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Mã Hoá đơn</TableHead>
                <TableHead className="font-bold">Mã Đặt phòng</TableHead>
                <TableHead className="font-bold">Tổng tiền</TableHead>
                <TableHead className="font-bold">Phương thức</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="font-bold">Ngày lập</TableHead>
                <TableHead className="font-bold text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    Không tìm thấy hoá đơn nào.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const statusInfo = statusMap[invoice.paymentStatus] || { label: invoice.paymentStatus, color: '' };
                  return (
                    <TableRow key={invoice.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {invoice.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {invoice.bookingId.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">
                        {invoice.paymentMethod ? (methodMap[invoice.paymentMethod] || invoice.paymentMethod) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatInTimezone(invoice.issuedAt, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.paymentStatus === PaymentStatus.PENDING ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenConfirmDialog(invoice)}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs font-bold"
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1" /> Thu tiền
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Hoàn tất</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manual Payment Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thu tiền mặt / Thanh toán thẻ</DialogTitle>
            <DialogDescription>
              Xác nhận khách hàng đã thanh toán hoá đơn này tại quầy lễ tân.
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4 py-4 border-t border-b border-slate-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Mã Hoá Đơn</span>
                  <span className="font-mono font-bold text-slate-700">{selectedInvoice.id.substring(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Số tiền thanh thu</span>
                  <span className="font-extrabold text-slate-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedInvoice.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Phương thức thanh toán trực tiếp</Label>
                <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                  <SelectTrigger id="method">
                    <SelectValue placeholder="Chọn phương thức" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Tiền mặt (Cash)</SelectItem>
                    <SelectItem value="CARD">💳 POS / Quẹt thẻ (Card)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleConfirmPayment} 
              disabled={confirmPaymentMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {confirmPaymentMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận đã thu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
