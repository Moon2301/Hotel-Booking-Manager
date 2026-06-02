'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Handshake, Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import {
  createPartner,
  listPartnerCommissions,
  listPartners,
  markCommissionPaidOut,
  updatePartner,
  type CreatePartnerInput,
  type PartnerCommissionRow,
  type PartnerSummary,
} from '@/lib/api/partners';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function moneyVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function slugifyCode(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

const emptyForm = (): CreatePartnerInput => ({
  name: '',
  code: '',
  commissionRatePercent: 5,
  contactEmail: '',
  contactPhone: '',
  notes: '',
});

const COMMISSION_STATUS_LABEL: Record<string, string> = {
  ACCRUED: 'Chờ chi trả',
  PAID_OUT: 'Đã chi',
  CANCELLED: 'Đã hủy',
};

export default function PartnersPage() {
  const { can } = usePermissions();
  const canEdit = can('partners:write');
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreatePartnerInput>(emptyForm);
  const [codeTouched, setCodeTouched] = useState(false);
  const [filterPartnerId, setFilterPartnerId] = useState<string>('all');

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: listPartners,
  });

  const { data: commissions = [], isLoading: commissionsLoading } = useQuery({
    queryKey: ['partner-commissions', filterPartnerId],
    queryFn: () =>
      listPartnerCommissions(
        filterPartnerId === 'all' ? undefined : filterPartnerId,
      ),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const code = form.code.trim().toLowerCase();
      if (!form.name.trim()) throw new Error('Nhập tên đối tác');
      if (!code) throw new Error('Nhập mã giới thiệu (ref)');
      const rate = Number(form.commissionRatePercent);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        throw new Error('% hoa hồng không hợp lệ (0–100)');
      }
      return createPartner({
        name: form.name.trim(),
        code,
        commissionRatePercent: rate,
        contactEmail: form.contactEmail?.trim() || undefined,
        contactPhone: form.contactPhone?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-commissions'] });
      setDialogOpen(false);
      setForm(emptyForm());
      setCodeTouched(false);
      toast({ title: 'Đã tạo đối tác' });
    },
    onError: (e: Error) => {
      toast({ title: 'Lỗi', description: e.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updatePartner(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: 'Đã cập nhật trạng thái' });
    },
  });

  const paidOutMutation = useMutation({
    mutationFn: (commissionId: string) => markCommissionPaidOut(commissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-commissions'] });
      toast({ title: 'Đã ghi nhận chi hoa hồng' });
    },
    onError: (e: Error) => {
      toast({ title: 'Lỗi', description: e.message, variant: 'destructive' });
    },
  });

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Đã sao chép link giới thiệu' });
    } catch {
      toast({
        title: 'Không sao chép được',
        description: url,
        variant: 'destructive',
      });
    }
  };

  const totals = useMemo(() => {
    let accrued = 0;
    let paidOut = 0;
    for (const p of partners) {
      accrued += p.stats.accruedCommission;
      paidOut += p.stats.paidOutCommission;
    }
    return { accrued, paidOut };
  }, [partners]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Handshake className="h-7 w-7" />
            Đối tác giới thiệu
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Mỗi đối tác có link dạng trang chủ{' '}
            <code className="rounded bg-muted px-1">/?ref=mã-đối-tác</code>. Khách
            đặt phòng qua link đó và thanh toán thành công sẽ được tính hoa hồng.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setForm(emptyForm());
              setCodeTouched(false);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm đối tác
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Hoa hồng chờ chi</p>
          <p className="text-xl font-semibold">{moneyVnd(totals.accrued)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Đã chi cho đối tác</p>
          <p className="text-xl font-semibold">{moneyVnd(totals.paidOut)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Số đối tác</p>
          <p className="text-xl font-semibold">{partners.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Danh sách đối tác</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mã ref</TableHead>
                <TableHead>% HH</TableHead>
                <TableHead>Đặt qua link</TableHead>
                <TableHead>HH chờ chi</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Đang tải…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Chưa có đối tác. Thêm đối tác để tạo link giới thiệu.
                  </TableCell>
                </TableRow>
              )}
              {partners.map((row: PartnerSummary) => (
                <TableRow key={row.partner.id}>
                  <TableCell className="font-medium">{row.partner.name}</TableCell>
                  <TableCell>
                    <code className="text-xs">{row.partner.code}</code>
                  </TableCell>
                  <TableCell>{Number(row.partner.commissionRatePercent)}%</TableCell>
                  <TableCell>{row.stats.paidBookings}</TableCell>
                  <TableCell>{moneyVnd(row.stats.accruedCommission)}</TableCell>
                  <TableCell>
                    {row.partner.isActive ? (
                      <Badge variant="default">Đang hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Tạm dừng</Badge>
                    )}
                    {canEdit && (
                      <Button
                        variant="link"
                        size="sm"
                        className="ml-2 h-auto p-0 text-xs"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: row.partner.id,
                            isActive: !row.partner.isActive,
                          })
                        }
                      >
                        {row.partner.isActive ? 'Tắt' : 'Bật'}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(row.referralUrl)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Sao chép
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Hoa hồng theo booking</h2>
          <Select value={filterPartnerId} onValueChange={setFilterPartnerId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Lọc đối tác" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đối tác</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.partner.id} value={p.partner.id}>
                  {p.partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Đối tác</TableHead>
                <TableHead>Khách / booking</TableHead>
                <TableHead>Doanh thu</TableHead>
                <TableHead>Hoa hồng</TableHead>
                <TableHead>Trạng thái</TableHead>
                {canEdit && <TableHead className="text-right">Thao tác</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionsLoading && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="text-center text-muted-foreground"
                  >
                    Đang tải…
                  </TableCell>
                </TableRow>
              )}
              {!commissionsLoading && commissions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="text-center text-muted-foreground"
                  >
                    Chưa có hoa hồng (cần booking thanh toán qua link ref).
                  </TableCell>
                </TableRow>
              )}
              {commissions.map((c: PartnerCommissionRow) => (
                <TableRow key={c.id}>
                  <TableCell>{c.partner?.name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {c.booking?.guest?.fullName ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.booking?.bookingCode ?? c.bookingId.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell>{moneyVnd(Number(c.bookingAmount))}</TableCell>
                  <TableCell>
                    {moneyVnd(Number(c.commissionAmount))} (
                    {Number(c.commissionRatePercent)}%)
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === 'PAID_OUT'
                          ? 'default'
                          : c.status === 'CANCELLED'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {COMMISSION_STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {c.status === 'ACCRUED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={paidOutMutation.isPending}
                          onClick={() => paidOutMutation.mutate(c.id)}
                        >
                          Đã chi HH
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm đối tác giới thiệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Tên đối tác</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    code: codeTouched ? f.code : slugifyCode(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-code">Mã ref (URL)</Label>
              <Input
                id="p-code"
                value={form.code}
                onChange={(e) => {
                  setCodeTouched(true);
                  setForm((f) => ({ ...f, code: e.target.value }));
                }}
                placeholder="vd: du-lich-abc"
              />
              <p className="text-xs text-muted-foreground">
                Link: /?ref={form.code || 'ma-doi-tac'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-rate">% hoa hồng</Label>
              <Input
                id="p-rate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.commissionRatePercent}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    commissionRatePercent: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={form.contactEmail ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactEmail: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Điện thoại</Label>
                <Input
                  id="p-phone"
                  value={form.contactPhone ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-notes">Ghi chú</Label>
              <Input
                id="p-notes"
                value={form.notes ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              Tạo đối tác
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
