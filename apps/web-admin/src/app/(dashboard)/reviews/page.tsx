'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Star,
  CheckCircle,
  EyeOff,
  Eye,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import { useReviews, useModerateReview, reviewKeys } from '@/hooks/queries/use-reviews';
import { ReviewStatus } from '@/types';
import type { Review } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
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

const statusMap: Record<
  ReviewStatus,
  { label: string; color: string }
> = {
  [ReviewStatus.FLAGGED]: {
    label: 'Cần duyệt',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  [ReviewStatus.PUBLISHED]: {
    label: 'Đang hiển thị',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  [ReviewStatus.HIDDEN]: {
    label: 'Đã ẩn',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  },
};

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const { data: response, isLoading, isError, error } = useReviews();
  const reviews = response?.data ?? [];
  const moderateReviewMutation = useModerateReview();

  const [activeTab, setActiveTab] = useState<ReviewStatus>(ReviewStatus.FLAGGED);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');

  const handlePublish = (id: string) => {
    moderateReviewMutation.mutate({
      id,
      data: { status: ReviewStatus.PUBLISHED },
    });
  };

  const handleOpenHideDialog = (id: string) => {
    setSelectedReviewId(id);
    setHideReason('');
    setDialogOpen(true);
  };

  const handleHide = () => {
    if (!selectedReviewId || !hideReason.trim()) return;
    moderateReviewMutation.mutate(
      {
        id: selectedReviewId,
        data: {
          status: ReviewStatus.HIDDEN,
          reason: hideReason.trim(),
        },
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedReviewId(null);
        },
      }
    );
  };

  const filteredReviews = reviews.filter((rev) => rev.status === activeTab);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
        <p className="font-semibold text-destructive">
          Không thể tải danh sách đánh giá.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kiểm duyệt đánh giá</h1>
          <p className="text-sm text-muted-foreground">
            FLAGGED → duyệt hiển thị (PUBLISHED) hoặc ẩn (HIDDEN)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: reviewKeys.all })
          }
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ReviewStatus)}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value={ReviewStatus.FLAGGED}>
            Cần duyệt (
            {reviews.filter((r) => r.status === ReviewStatus.FLAGGED).length})
          </TabsTrigger>
          <TabsTrigger value={ReviewStatus.PUBLISHED}>
            Hiển thị (
            {reviews.filter((r) => r.status === ReviewStatus.PUBLISHED).length})
          </TabsTrigger>
          <TabsTrigger value={ReviewStatus.HIDDEN}>
            Đã ẩn (
            {reviews.filter((r) => r.status === ReviewStatus.HIDDEN).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Đang tải...
            </p>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">Không có đánh giá trong mục này.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onPublish={() => handlePublish(review.id)}
                  onHide={() => handleOpenHideDialog(review.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ẩn đánh giá</DialogTitle>
            <DialogDescription>
              Nhập lý do ẩn (bắt buộc theo API).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Lý do</Label>
            <Textarea
              id="reason"
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="Spam, nội dung không phù hợp..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleHide}
              disabled={
                moderateReviewMutation.isPending || !hideReason.trim()
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              Xác nhận ẩn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewCard({
  review,
  onPublish,
  onHide,
}: {
  review: Review;
  onPublish: () => void;
  onHide: () => void;
}) {
  const info = statusMap[review.status];
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);
  const guestName =
    review.guest?.fullName || review.booking?.guest?.fullName || 'Khách';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{guestName}</p>
            <p className="text-xs text-muted-foreground">
              {formatInTimezone(
                review.createdAt,
                'Asia/Ho_Chi_Minh',
                'dd/MM/yyyy HH:mm'
              )}
            </p>
          </div>
          <Badge className={info.color}>{info.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-2">
        <div className="flex gap-0.5">
          {stars.map((filled, idx) => (
            <Star
              key={idx}
              className={`h-4 w-4 ${filled ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {review.content || '—'}
        </p>
        {review.flaggedReason && (
          <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
            Flag: {review.flaggedReason}
          </p>
        )}
        {review.hiddenReason && (
          <p className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-800">
            Ẩn: {review.hiddenReason}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-3">
        {review.status !== ReviewStatus.HIDDEN && (
          <Button variant="outline" size="sm" onClick={onHide}>
            <EyeOff className="mr-1 h-3.5 w-3.5" />
            Ẩn
          </Button>
        )}
        {review.status !== ReviewStatus.PUBLISHED && (
          <Button size="sm" onClick={onPublish}>
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            Hiển thị
          </Button>
        )}
        {review.status === ReviewStatus.HIDDEN && (
          <Button variant="ghost" size="sm" onClick={onPublish}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            Hiện lại
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
