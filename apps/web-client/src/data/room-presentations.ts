import type { LucideIcon } from 'lucide-react';
import {
  Wifi,
  Wind,
  Coffee,
  Bath,
  Tv,
  Shield,
  UtensilsCrossed,
  Maximize2,
  Waves,
  Crown,
  BedDouble,
} from 'lucide-react';

export interface RoomAmenity {
  label: string;
  icon: LucideIcon;
}

export interface RoomPresentation {
  imageUrl: string;
  description: string;
  amenities: RoomAmenity[];
  badge?: string;
}

const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  'wi-fi': Wifi,
  ban: Maximize2,
  balcony: Maximize2,
  view: Maximize2,
  minibar: Coffee,
  bath: Bath,
  'bồn tắm': Bath,
  tv: Tv,
  'smart tv': Tv,
  safe: Shield,
  'két': Shield,
  ac: Wind,
  'điều hòa': Wind,
  room: UtensilsCrossed,
  'dịch vụ': UtensilsCrossed,
  sea: Waves,
  biển: Waves,
  ocean: Waves,
  pool: Waves,
  'hồ bơi': Waves,
  bed: BedDouble,
  giường: BedDouble,
  bếp: Coffee,
  butler: Crown,
  villa: Crown,
};

function iconForLabel(label: string): LucideIcon {
  const lower = label.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return Wifi;
}

const PRESETS: Record<string, RoomPresentation> = {
  'Deluxe Sea View': {
    badge: 'Phổ biến nhất',
    imageUrl:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=1200',
    description:
      'Phòng 35m² hướng biển với ban công riêng, giường king size, khu vực làm việc và phòng tắm đứng + bồn tắm. Lý tưởng cho cặp đôi hoặc khách công tác.',
    amenities: [
      { label: 'WiFi tốc độ cao', icon: Wifi },
      { label: 'Ban công hướng biển', icon: Waves },
      { label: 'Minibar', icon: Coffee },
      { label: 'Bồn tắm & vòi sen', icon: Bath },
      { label: 'Điều hòa trung tâm', icon: Wind },
      { label: 'Smart TV 55"', icon: Tv },
      { label: 'Két an toàn', icon: Shield },
      { label: 'Dịch vụ phòng 24/7', icon: UtensilsCrossed },
    ],
  },
  'Superior City View': {
    imageUrl:
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1200',
    description:
      'Phòng 28m² nhìn thành phố, thiết kế hiện đại, giường queen, bàn làm việc — phù hợp nghỉ ngắn ngày.',
    amenities: [
      { label: 'WiFi miễn phí', icon: Wifi },
      { label: 'View thành phố', icon: Maximize2 },
      { label: 'Điều hòa', icon: Wind },
      { label: 'Smart TV', icon: Tv },
      { label: 'Minibar', icon: Coffee },
      { label: 'Phòng tắm vòi sen', icon: Bath },
    ],
  },
  'Standard Twin': {
    badge: 'Tiết kiệm',
    imageUrl:
      'https://images.unsplash.com/photo-1590490360182-c33a577e27a8?auto=format&fit=crop&q=80&w=1200',
    description:
      'Phòng tiêu chuẩn với hai giường đơn, đầy đủ tiện nghi cơ bản, giá tốt cho nhóm bạn hoặc công tác.',
    amenities: [
      { label: '2 giường đơn', icon: BedDouble },
      { label: 'WiFi miễn phí', icon: Wifi },
      { label: 'Điều hòa', icon: Wind },
      { label: 'TV cáp', icon: Tv },
      { label: 'Phòng tắm riêng', icon: Bath },
    ],
  },
  'Family Suite': {
    badge: 'Gia đình',
    imageUrl:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200',
    description:
      'Suite 55m² gồm phòng khách và phòng ngủ riêng, tối đa 4 khách, bếp lạnh và sofa bed.',
    amenities: [
      { label: 'Phòng khách riêng', icon: Maximize2 },
      { label: '2 khu vực ngủ', icon: BedDouble },
      { label: 'Bếp lạnh', icon: Coffee },
      { label: 'WiFi & Smart TV', icon: Wifi },
      { label: 'Bồn tắm lớn', icon: Bath },
    ],
  },
  'Premier Ocean Suite': {
    badge: 'Cao cấp',
    imageUrl:
      'https://images.unsplash.com/photo-1591088398332-8a2596a9c921?auto=format&fit=crop&q=80&w=1200',
    description:
      'Suite 65m² view panorama biển, bồn tắm kính, minibar cao cấp và không gian tiếp khách riêng.',
    amenities: [
      { label: 'View panorama biển', icon: Waves },
      { label: 'Bồn tắm view biển', icon: Bath },
      { label: 'Dịch vụ butler', icon: Crown },
      { label: 'Smart TV 65"', icon: Tv },
      { label: 'Minibar cao cấp', icon: Coffee },
    ],
  },
  'Presidential Villa': {
    badge: 'Đỉnh cao',
    imageUrl:
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1200',
    description:
      'Villa riêng 120m² với hồ bơi mini, sân vườn, hai phòng ngủ và quản gia — trải nghiệm sang trọng bậc nhất.',
    amenities: [
      { label: 'Hồ bơi riêng', icon: Waves },
      { label: 'Sân vườn', icon: Maximize2 },
      { label: 'Quản gia 24/7', icon: Crown },
      { label: 'Xe đưa đón riêng', icon: UtensilsCrossed },
      { label: 'Bếp đầy đủ', icon: Coffee },
    ],
  },
};

const DEFAULT_PRESENTATION: RoomPresentation = {
  imageUrl:
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1200',
  description:
    'Phòng nghỉ tiện nghi, thiết kế tối giản sang trọng với đầy đủ tiện nghi cơ bản cho kỳ nghỉ của bạn.',
  amenities: [
    { label: 'WiFi miễn phí', icon: Wifi },
    { label: 'Điều hòa', icon: Wind },
    { label: 'Smart TV', icon: Tv },
    { label: 'Minibar', icon: Coffee },
    { label: 'Phòng tắm riêng', icon: Bath },
  ],
};

export function getRoomPresentation(room: {
  name: string;
  description?: string | null;
  amenities?: string[];
}): RoomPresentation {
  const preset = PRESETS[room.name] ?? DEFAULT_PRESENTATION;

  const description = room.description?.trim() || preset.description;

  const amenities: RoomAmenity[] =
    room.amenities && room.amenities.length > 0
      ? room.amenities.map((label) => ({
          label,
          icon: iconForLabel(label),
        }))
      : preset.amenities;

  return {
    imageUrl: preset.imageUrl,
    description,
    amenities,
    badge: preset.badge,
  };
}
