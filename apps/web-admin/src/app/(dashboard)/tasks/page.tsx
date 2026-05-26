'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  Coffee, 
  Truck, 
  HelpCircle, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Play,
  Check,
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

import { ClientOnly } from '@/components/client-only';
import { useTasks, useUpdateTask, taskKeys } from '@/hooks/queries/use-tasks';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { TaskStatus, TaskType } from '@/types';
import type { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const typeMap: Record<TaskType, { label: string; color: string; icon: any }> = {
  [TaskType.CLEANING]: { label: 'Dọn phòng', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Sparkles },
  [TaskType.FOOD]: { label: 'Ăn uống', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Coffee },
  [TaskType.TRANSPORT]: { label: 'Đưa đón', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Truck },
  [TaskType.OTHER]: { label: 'Khác', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: HelpCircle },
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: tasks = [], isLoading, isError, error } = useTasks();
  const updateTaskMutation = useUpdateTask();

  // Dialog State
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [staffReport, setStaffReport] = useState('');

  const handleClaim = (taskId: string) => {
    if (!user) return;
    updateTaskMutation.mutate({
      id: taskId,
      data: {
        status: TaskStatus.IN_PROGRESS,
        assignedToId: user.id
      }
    }, {
      onSuccess: () => {
        toast({
          title: 'Đã nhận việc',
          description: 'Task chuyển sang cột Đang thực hiện.',
        });
      },
    });
  };

  const handleOpenCompleteDialog = (taskId: string) => {
    setSelectedTaskId(taskId);
    setStaffReport('');
    setCompleteDialogOpen(true);
  };

  const handleComplete = () => {
    if (!selectedTaskId) return;
    updateTaskMutation.mutate({
      id: selectedTaskId,
      data: {
        status: TaskStatus.COMPLETED,
        staffReport: staffReport.trim()
      }
    }, {
      onSuccess: () => {
        setCompleteDialogOpen(false);
        setSelectedTaskId(null);
        toast({
          title: 'Hoàn thành dịch vụ',
          description: 'Khách sẽ nhận thông báo cập nhật trên My Stay.',
        });
      }
    });
  };

  const handleCancel = (taskId: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy yêu cầu này?')) {
      updateTaskMutation.mutate({
        id: taskId,
        data: { status: TaskStatus.CANCELLED }
      });
    }
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
  const cancelledTasks = tasks.filter(t => t.status === TaskStatus.CANCELLED);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4 animate-bounce" />
        <p className="text-destructive font-semibold">
          Không thể tải danh sách công việc.
        </p>
        <p className="text-slate-400 text-sm mt-1">
          {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Điều Phối Dịch Vụ (Tasks)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bảng điều phối và theo dõi các dịch vụ phòng thời gian thực.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: taskKeys.all })} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4 text-sm font-semibold">Đang tải bảng công việc...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Column 1: Pending */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 text-sm">Chờ Xử Lý</span>
              <Badge variant="secondary" className="font-mono bg-slate-200 text-slate-800">{pendingTasks.length}</Badge>
            </div>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {pendingTasks.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-xs">
                  <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Không có yêu cầu
                </div>
              ) : (
                pendingTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClaim={() => handleClaim(task.id)}
                    onCancel={() => handleCancel(task.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="font-bold text-blue-700 text-sm">Đang Thực Hiện</span>
              <Badge className="font-mono bg-blue-100 text-blue-800">{inProgressTasks.length}</Badge>
            </div>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {inProgressTasks.length === 0 ? (
                <div className="border-2 border-dashed border-blue-100/40 rounded-xl py-12 text-center text-slate-400 text-xs">
                  <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Không có công việc đang chạy
                </div>
              ) : (
                inProgressTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={() => handleOpenCompleteDialog(task.id)}
                    onCancel={() => handleCancel(task.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <span className="font-bold text-emerald-700 text-sm">Đã Hoàn Thành</span>
              <Badge className="font-mono bg-emerald-100 text-emerald-800">{completedTasks.length}</Badge>
            </div>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {completedTasks.length === 0 ? (
                <div className="border-2 border-dashed border-emerald-100/40 rounded-xl py-12 text-center text-slate-400 text-xs">
                  <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Chưa có công việc hoàn thành
                </div>
              ) : (
                completedTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          {/* Column 4: Cancelled */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-rose-50 p-3 rounded-lg border border-rose-100">
              <span className="font-bold text-rose-700 text-sm">Đã Hủy</span>
              <Badge className="font-mono bg-rose-100 text-rose-800">{cancelledTasks.length}</Badge>
            </div>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {cancelledTasks.length === 0 ? (
                <div className="border-2 border-dashed border-rose-100/40 rounded-xl py-12 text-center text-slate-400 text-xs">
                  <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Trống
                </div>
              ) : (
                cancelledTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hoàn thành dịch vụ phòng</DialogTitle>
            <DialogDescription>
              Hãy điền báo cáo hoặc kết quả xử lý dịch vụ phòng để khách hàng tiện theo dõi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report">Báo cáo của nhân viên (Ghi chú)</Label>
              <Textarea
                id="report"
                placeholder="VD: Đã dọn dẹp sạch sẽ phòng, thay 2 bộ drap và khăn tắm mới..."
                value={staffReport}
                onChange={(e) => setStaffReport(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleComplete} disabled={updateTaskMutation.isPending}>
              Xác nhận hoàn thành
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClaim?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

function TaskCard({ task, onClaim, onComplete, onCancel }: TaskCardProps) {
  const typeInfo = typeMap[task.type] || typeMap[TaskType.OTHER];
  const TypeIcon = typeInfo.icon;
  
  const createdDate = new Date(task.createdAt);

  return (
    <Card className="hover:shadow-md transition-shadow border-slate-200">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <Badge className={`border font-semibold flex items-center gap-1 ${typeInfo.color}`}>
          <TypeIcon className="h-3 w-3" />
          {typeInfo.label}
        </Badge>
        <span className="font-extrabold text-sm text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {task.booking?.room?.roomNumber ? `P.${task.booking.room.roomNumber}` : '—'}
        </span>
      </CardHeader>
      
      <CardContent className="p-4 pt-1 pb-3 space-y-2">
        <p className="text-xs text-slate-600 line-clamp-3 italic" title={task.guestNote || ''}>
          "{task.guestNote || 'Không có ghi chú'}"
        </p>

        {task.staffReport && (
          <div className="bg-emerald-50/50 border border-emerald-100/40 p-2 rounded text-[11px] text-emerald-800">
            <strong className="block mb-0.5">Báo cáo:</strong>
            {task.staffReport}
          </div>
        )}

        <div className="border-t border-slate-100 pt-2 flex flex-col gap-1 text-[10px] text-slate-400">
          <ClientOnly
            fallback={
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                …
              </span>
            }
          >
            <span className="flex items-center gap-1" suppressHydrationWarning>
              <Clock className="h-3 w-3" />
              {createdDate.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              - {createdDate.toLocaleDateString('vi-VN')}
            </span>
          </ClientOnly>
          {task.assignee && (
            <span className="flex items-center gap-1 font-medium text-slate-500">
              <User className="h-3 w-3" />
              NV: {task.assignee.fullName}
            </span>
          )}
        </div>
      </CardContent>

      {(onClaim || onComplete || onCancel) && (
        <CardFooter className="p-3 bg-slate-50/50 border-t border-slate-100/60 flex justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-rose-600 hover:bg-rose-50 h-8 text-xs font-bold">
              <XCircle className="h-3.5 w-3.5 mr-1" /> Hủy
            </Button>
          )}
          {onClaim && (
            <Button size="sm" onClick={onClaim} className="bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs font-bold">
              <Play className="h-3.5 w-3.5 mr-1" /> Nhận việc
            </Button>
          )}
          {onComplete && (
            <Button size="sm" onClick={onComplete} className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs font-bold">
              <Check className="h-3.5 w-3.5 mr-1" /> Hoàn thành
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
