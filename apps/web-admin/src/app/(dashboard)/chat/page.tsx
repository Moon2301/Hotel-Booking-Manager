'use client';

import { MessageSquare } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Inbox
          </CardTitle>
          <CardDescription>
            Module chat real-time (Socket.IO) đang được triển khai. API{' '}
            <code className="text-xs">/api/v1/chat</code> đã có trên backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tạm thời dùng web client hoặc API trực tiếp để hỗ trợ khách. Trang
          inbox admin sẽ được bổ sung trong task tiếp theo.
        </CardContent>
      </Card>
    </div>
  );
}
