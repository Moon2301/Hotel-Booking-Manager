'use client';

import { ScrollText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AuditLogPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Truy vết hành động nhạy cảm với JSON diff — UI danh sách sẽ được
            nối API audit trong bước tiếp theo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Dữ liệu audit đã được ghi khi tạo/sửa property, booking, thanh toán,
          v.v. trên backend.
        </CardContent>
      </Card>
    </div>
  );
}
