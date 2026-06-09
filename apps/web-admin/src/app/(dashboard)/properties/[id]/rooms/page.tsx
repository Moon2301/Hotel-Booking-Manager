'use client';

export default function RoomsPage({ params }: { params: { id: string } }) {
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Danh sách phòng vật lý</h2>
      <p className="text-muted-foreground text-sm">
        Tính năng thêm, sửa, xóa phòng cụ thể (ví dụ: Phòng 101, 102...) sẽ được triển khai trong bản cập nhật tới.
      </p>
    </div>
  );
}
