import type { LucideIcon } from 'lucide-react';
import {
  Wifi,
  Waves,
  UtensilsCrossed,
  Dumbbell,
  Sparkles,
  Car,
  Shirt,
  ConciergeBell,
} from 'lucide-react';

export interface AmenityItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Tiện ích khách sạn — hiển thị công khai, không phải loại yêu cầu phòng */
export const HOTEL_AMENITIES: AmenityItem[] = [
  {
    icon: Wifi,
    title: 'WiFi tốc độ cao',
    description: 'Miễn phí trong toàn khuôn viên và tại phòng nghỉ.',
  },
  {
    icon: Waves,
    title: 'Hồ bơi vô cực',
    description: 'Tầm nhìn biển, mở cửa 6:00–22:00 mỗi ngày.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Nhà hàng & bar',
    description: 'Ẩm thực địa phương và quốc tế, phục vụ tại chỗ.',
  },
  {
    icon: Dumbbell,
    title: 'Phòng gym',
    description: 'Trang thiết bị hiện đại, phục vụ 24/7.',
  },
  {
    icon: Sparkles,
    title: 'Spa & wellness',
    description: 'Liệu pháp thư giãn và chăm sóc sức khỏe.',
  },
  {
    icon: Car,
    title: 'Bãi đỗ xe & đưa đón',
    description: 'Bãi xe an toàn, hỗ trợ sắp xếp xe đưa đón sân bay.',
  },
  {
    icon: Shirt,
    title: 'Giặt ủi',
    description: 'Dịch vụ giặt là nhanh, giao trả tại phòng.',
  },
  {
    icon: ConciergeBell,
    title: 'Lễ tân 24/7',
    description: 'Hỗ trợ check-in, tour và thông tin địa phương.',
  },
];
