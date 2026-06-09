import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxFiles?: number;
}

export function ImageUpload({ value = [], onChange, maxFiles = 10 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    if (value.length + files.length > maxFiles) {
      toast({ title: 'Lỗi', description: `Chỉ được tải lên tối đa ${maxFiles} ảnh`, variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    const newImages = [...value];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/v1/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        newImages.push(data.url);
      } catch (err) {
        toast({ title: 'Lỗi', description: `Upload ảnh ${file.name} thất bại`, variant: 'destructive' });
      }
    }

    onChange(newImages);
    setIsUploading(false);
    // Reset input
    e.target.value = '';
  };

  const onRemove = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {value.map((url, i) => (
          <div key={i} className="relative h-[200px] w-[200px] rounded-md overflow-hidden border">
            <div className="absolute top-2 right-2 z-10">
              <Button type="button" variant="destructive" size="icon" className="h-6 w-6" onClick={() => onRemove(url)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Uploaded image" className="object-cover w-full h-full" />
          </div>
        ))}
      </div>
      <div>
        <Button type="button" variant="secondary" disabled={isUploading || value.length >= maxFiles} className="relative">
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4 mr-2" />
          )}
          Tải ảnh lên
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={onUpload}
            disabled={isUploading || value.length >= maxFiles}
          />
        </Button>
      </div>
    </div>
  );
}
