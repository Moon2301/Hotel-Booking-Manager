'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Star, 
  Check, 
  X, 
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  EyeOff,
  CheckCircle,
  Eye
} from 'lucide-react';

import { useReviews, useModerateReview, reviewKeys } from '@/hooks/queries/use-reviews';
import { ReviewStatus } from '@/types';
import type { Review } from '@/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatInTimezone } from '@/lib/timezone';

const statusMap: Record<ReviewStatus, { label: string; color: string }> = {
  [ReviewStatus.PENDING]: { label: 'Chờ duyệt', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  [ReviewStatus.APPROVED]: { label: 'Hiển thị', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  [ReviewStatus.REJECTED]: { label: 'Bị ẩn', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
};

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading, isError, error } = useReviews();
  const reviews = response?.items || [];
  const moderateReviewMutation = useModerateReview();

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('PENDING');

  // Moderation Dialog State (for rejecting with reason)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (id: string) => {
    moderateReviewMutation.mutate({
      id,
      data: { status: ReviewStatus.APPROVED }
    });
  };

  const handleOpenRejectDialog = (id: string) => {
    setSelectedReviewId(id);
    setRejectReason('');
    setDialogOpen(true);
  };

  const handleReject = () => {
    if (!selectedReviewId) return;
    moderateReviewMutation.mutate({
      id: selectedReviewId,
      data: {
        status: ReviewStatus.REJECTED,
        reason: rejectReason.trim()
      }
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedReviewId(null);
      }
    });
  };

  // Filter reviews client-side based on tab selection
  const filteredReviews = reviews.filter(rev => rev.status === activeTab);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4 animate-pulse" />
        <p className="text-destructive font-semibold">Không thể tải danh sách đánh giá.</p>
        <p className="text-slate-400 text-sm mt-1">{error instanceof Error ? error.message : 'Lỗi không xác định'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Kiểm Duyệt Đánh Giá (Reviews)</h1>
          <p className="text-slate-500 text-sm mt-1">Duyệt hoặc ẩn các phản hồi từ khách hàng sau khi lưu trú.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: reviewKeys.all })} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="PENDING" className="rounded-lg px-4 py-2 text-sm font-semibold">
            Chờ kiểm duyệt ({reviews.filter(r => r.status === ReviewStatus.PENDING).length})
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="rounded-lg px-4 py-2 text-sm font-semibold">
            Đang hiển thị ({reviews.filter(r => r.status === ReviewStatus.APPROVED).length})
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="rounded-lg px-4 py-2 text-sm font-semibold">
            Bị ẩn ({reviews.filter(r => r.status === ReviewStatus.REJECTED).length})
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            <p className="text-slate-500 mt-4 text-sm font-semibold">Đang tải danh sách đánh giá...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.length === 0 ? (
              <div className="col-span-full border-2 border-dashed border-slate-200 rounded-2xl py-20 text-center text-slate-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Không tìm thấy đánh giá nào trong danh mục này.</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  review={review}
                  onApprove={() => handleApprove(review.id)}
                  onReject={() => handleOpenRejectDialog(review.id)}
                />
              ))
            )}
          </div>
        )}
      </Tabs>

      {/* Reject Reason Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối & Ẩn đánh giá</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do ẩn đánh giá này (lý do sẽ được ghi vào lịch sử kiểm duyệt).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do từ chối (Từ khóa nhạy cảm, spam, quảng cáo...)</Label>
              <Textarea
                id="reason"
                placeholder="VD: Chứa ngôn từ không phù hợp, quảng cáo spam..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleReject} 
              disabled={moderateReviewMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Xác nhận ẩn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
  onApprove: () => void;
  onReject: () => void;
}

function ReviewCard({ review, onApprove, onReject }: ReviewCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);
  
  const formattedDate = formatInTimezone(review.createdAt, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');

  return (
    <Card className="hover:shadow-md transition-all border-slate-200 flex flex-col justify-between">
      <CardHeader className="p-5 pb-3">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-extrabold text-slate-800 line-clamp-1">{review.booking?.guest?.fullName || 'Khách Mango'}</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{review.booking?.guest?.email || '—'}</p>
          </div>
          <Badge className={`border font-semibold ${
            review.status === ReviewStatus.APPROVED ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
            review.status === ReviewStatus.REJECTED ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
            'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}>
            {review.status === ReviewStatus.APPROVED ? 'Đã duyệt' : review.status === ReviewStatus.REJECTED ? 'Bị ẩn' : 'Chờ duyệt'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-5 pt-0 pb-4 flex-grow space-y-3">
        {/* Rating Stars */}
        <div className="flex items-center gap-0.5">
          {stars.map((filled, idx) => (
            <Star 
              key={idx} 
              className={`h-4.5 w-4.5 ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
            />
          ))}
        </div>

        {/* Comment */}
        <p className="text-slate-600 text-sm italic leading-relaxed">
          "{review.comment || 'Không có bình luận viết tay'}"
        </p>

        {/* Property name & Date */}
        <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex justify-between items-center">
          <span>Mango Resort</span>
          <span>{formattedDate}</span>
        </div>

        {review.moderationReason && (
          <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs text-rose-700 mt-2">
            <strong className="block mb-0.5">Lý do ẩn:</strong>
            {review.moderationReason}
          </div>
        )}
      </CardContent>

      {review.status === ReviewStatus.PENDING && (
        <CardFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onReject} className="text-rose-600 hover:bg-rose-50 border-rose-100 hover:border-rose-200 font-bold h-8 text-xs">
            <EyeOff className="h-3.5 w-3.5 mr-1" /> Ẩn đi
          </Button>
          <Button size="sm" onClick={onApprove} className="bg-slate-900 text-white hover:bg-slate-800 font-bold h-8 text-xs">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Phê duyệt
          </Button>
        </CardFooter>
      )}

      {review.status === ReviewStatus.REJECTED && (
        <CardFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end shrink-0">
          <Button variant="ghost" size="sm" onClick={onApprove} className="text-emerald-600 hover:bg-emerald-50 font-bold h-8 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" /> Hiện lại
          </Button>
        </CardFooter>
      )}

      {review.status === ReviewStatus.APPROVED && (
        <CardFooter className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end shrink-0">
          <Button variant="ghost" size="sm" onClick={onReject} className="text-rose-600 hover:bg-rose-50 font-bold h-8 text-xs">
            <EyeOff className="h-3.5 w-3.5 mr-1" /> Ẩn đánh giá
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
