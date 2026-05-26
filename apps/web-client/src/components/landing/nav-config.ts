export interface NavLinkItem {
  label: string;
  href: string;
  external?: boolean;
}

/** Thanh nav trang khách — link phẳng, không dropdown */
export const SITE_NAV: NavLinkItem[] = [
  { label: 'Giới thiệu', href: '/#about' },
  { label: 'Phòng', href: '/#rooms' },
  { label: 'Tiện ích', href: '/#amenities' },
  { label: 'Liên hệ', href: '/#contact' },
  { label: 'My Stay', href: '/my-stay' },
];

export const STRIP_FEATURES = [
  { label: 'Phòng sang trọng', icon: 'bookings' as const },
  { label: 'Tiện ích đầy đủ', icon: 'realtime' as const },
  { label: 'Đặt phòng trực tuyến', icon: 'cost' as const },
];
