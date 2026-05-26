'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import { usePropertySelection } from '@/providers/property-selection-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { get } from '@/lib/api-client';
import {
  createServiceItem,
  listServiceItems,
  updateServiceItem,
  type CreateServiceItemInput,
} from '@/lib/api/service-catalog';
import { toast } from '@/hooks/use-toast';
import type { Property, ServiceCategory, ServiceItem } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';

const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  FOOD: 'Ăn uống',
  LAUNDRY: 'Giặt ủi',
  MINIBAR: 'Mini bar',
  TRANSPORT: 'Đưa đón',
  OTHER: 'Khác',
};

const CATEGORIES: ServiceCategory[] = [
  'FOOD',
  'LAUNDRY',
  'MINIBAR',
  'TRANSPORT',
  'OTHER',
];

function moneyVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

type FormState = {
  name: string;
  category: ServiceCategory;
  unit: string;
  unitPrice: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  category: 'OTHER',
  unit: 'lần',
  unitPrice: '',
  isActive: true,
});

export default function ServiceCatalogPage() {
  const { selectedPropertyId, setSelectedPropertyId } = usePropertySelection();
  const { can } = usePermissions();
  const canEdit = can('properties:write');
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => get<Property[]>('/properties'),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['service-items', selectedPropertyId, 'all'],
    queryFn: () => listServiceItems(selectedPropertyId, true),
    enabled: !!selectedPropertyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const unitPrice = Number(form.unitPrice);
      if (!form.name.trim()) throw new Error('Nhập tên dịch vụ');
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('Đơn giá không hợp lệ');
      }
      const payload: CreateServiceItemInput = {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit.trim() || 'lần',
        unitPrice,
        isActive: form.isActive,
      };
      if (editing) {
        return updateServiceItem(selectedPropertyId, editing.id, payload);
      }
      return createServiceItem(selectedPropertyId, payload);
    },
    onSuccess: async () => {
      toast({
        title: editing ? 'Đã cập nhật dịch vụ' : 'Đã thêm dịch vụ',
      });
      queryClient.invalidateQueries({ queryKey: ['service-items', selectedPropertyId] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: err.message,
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bảng giá dịch vụ</h1>
          <p className="text-sm text-muted-foreground">
            Danh mục dùng khi ghi phát sinh vào phòng (Room Board → click phòng).
          </p>
        </div>
        {canEdit && selectedPropertyId && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm dịch vụ
          </Button>
        )}
      </div>

      <div className="w-full max-w-sm">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
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

      {!selectedPropertyId ? (
        <p className="text-muted-foreground">Chọn cơ sở để xem bảng giá.</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">
          Chưa có dịch vụ. {canEdit ? 'Bấm "Thêm dịch vụ" hoặc chạy seed.' : ''}
        </p>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
                <TableHead>Trạng thái</TableHead>
                {canEdit && <TableHead className="text-right"> </TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={!item.isActive ? 'opacity-60' : undefined}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{CATEGORY_LABEL[item.category] || item.category}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {moneyVnd(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'default' : 'secondary'}>
                      {item.isActive ? 'Đang bán' : 'Ẩn'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên dịch vụ</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Giặt ủi (bộ)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nhóm</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as ServiceCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Đơn vị</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="lần, bộ, chai..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Đơn giá (VND)</Label>
              <Input
                type="number"
                min={0}
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                placeholder="80000"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="isActive">Đang bán (hiện khi charge phòng)</Label>
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
