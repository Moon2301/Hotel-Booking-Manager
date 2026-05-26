'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { toast } from '@/hooks/use-toast';
import { taskKeys } from '@/hooks/queries/use-tasks';
import { TaskStatus, TaskType } from '@/types';
import type { Task } from '@/types';

const TYPE_LABEL: Record<TaskType, string> = {
  [TaskType.CLEANING]: 'Dọn phòng',
  [TaskType.FOOD]: 'Ăn uống',
  [TaskType.TRANSPORT]: 'Đưa đón',
  [TaskType.OTHER]: 'Khác',
};

function showNativeNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // Some browsers block notifications outside secure context
  }
}

function notifyStaffTaskEvent(data: { event: 'created' | 'updated'; task: Task }) {
  const taskLabel = TYPE_LABEL[data.task.type as TaskType] || data.task.type;
  const roomNum = data.task.booking?.room?.roomNumber || '—';

  if (data.event === 'created') {
    const title = `Phòng ${roomNum}: Yêu cầu ${taskLabel}`;
    const body = data.task.guestNote?.trim()
      ? `"${data.task.guestNote.trim()}"`
      : 'Khách vừa gửi yêu cầu dịch vụ mới.';
    toast({ title, description: body });
    showNativeNotification(title, body);
    return;
  }

  if (data.task.status === TaskStatus.IN_PROGRESS) {
    const title = `Phòng ${roomNum}: Đã có người nhận`;
    const body = `Yêu cầu ${taskLabel} đang được xử lý.`;
    toast({ title, description: body });
    showNativeNotification(title, body);
  } else if (data.task.status === TaskStatus.COMPLETED) {
    const title = `Phòng ${roomNum}: Hoàn thành ${taskLabel}`;
    const body = data.task.staffReport?.trim() || 'Nhân viên đã hoàn thành dịch vụ.';
    toast({ title, description: body });
  }
}

/**
 * Real-time task alerts for all admin pages (not only /tasks).
 */
export function TaskNotificationsListener() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        const res = await fetch('/api/auth/token');
        if (!res.ok || cancelled) return;
        const { token } = await res.json();
        if (!token || cancelled) return;

        const apiOrigin =
          process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
          `${window.location.protocol}//${window.location.hostname}:3000`;

        const socket = io(`${apiOrigin}/tasks`, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('task_changed', (data: { event: 'created' | 'updated'; task: Task }) => {
          queryClient.invalidateQueries({ queryKey: taskKeys.all });
          notifyStaffTaskEvent(data);
        });
      } catch (err) {
        console.error('Task notification socket error:', err);
      }
    };

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return null;
}
