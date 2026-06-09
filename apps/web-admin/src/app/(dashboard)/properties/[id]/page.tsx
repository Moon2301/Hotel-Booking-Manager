'use client';

import { useState, useEffect } from 'react';
import { useProperty, useUpdateProperty } from '@/hooks/queries/use-properties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/image-upload';
import { useToast } from '@/components/ui/use-toast';

export default function PropertyOverviewPage({ params }: { params: { id: string } }) {
  const { data: property, isLoading } = useProperty(params.id);
  const { mutate: updateProperty, isPending } = useUpdateProperty();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    images: [] as string[],
  });

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        description: property.description || '',
        images: property.images || [],
      });
    }
  }, [property]);

  if (isLoading) return <div>Loading...</div>;
  if (!property) return <div>Property not found</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProperty(
      { id: params.id, data: formData },
      {
        onSuccess: () => {
          toast({ title: 'Thành công', description: 'Cập nhật thông tin thành công' });
        },
        onError: () => {
          toast({ title: 'Lỗi', description: 'Cập nhật thất bại', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mt-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Tên khách sạn</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Mô tả (Description)</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Hình ảnh khách sạn</Label>
          <ImageUpload
            value={formData.images}
            onChange={(images) => setFormData({ ...formData, images })}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </div>
  );
}
