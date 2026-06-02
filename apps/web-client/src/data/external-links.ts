import type { LucideIcon } from 'lucide-react';
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  ExternalLink,
  MapPin,
} from 'lucide-react';

export interface ExternalLinkItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

function envOrDefault(
  key: keyof ImportMetaEnv,
  fallback: string,
): string | null {
  const raw = import.meta.env[key];
  if (raw === 'off' || raw === 'false') return null;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (fallback.trim()) return fallback.trim();
  return null;
}

function item(
  id: string,
  label: string,
  envKey: keyof ImportMetaEnv,
  fallback: string,
  icon: LucideIcon,
): ExternalLinkItem | null {
  const href = envOrDefault(envKey, fallback);
  if (!href) return null;
  return { id, label, href, icon };
}

/** Mạng xã hội — URL trong `apps/web-client/.env` (xem `.env.example`) */
export function getSocialLinks(): ExternalLinkItem[] {
  return [
    item(
      'facebook',
      'Facebook',
      'VITE_FACEBOOK_URL',
      'https://www.facebook.com/',
      Facebook,
    ),
    item(
      'instagram',
      'Instagram',
      'VITE_INSTAGRAM_URL',
      'https://www.instagram.com/',
      Instagram,
    ),
    item(
      'youtube',
      'YouTube',
      'VITE_YOUTUBE_URL',
      'https://www.youtube.com/',
      Youtube,
    ),
    item(
      'tiktok',
      'TikTok',
      'VITE_TIKTOK_URL',
      'https://www.tiktok.com/',
      ExternalLink,
    ),
    item('linkedin', 'LinkedIn', 'VITE_LINKEDIN_URL', '', Linkedin),
  ].filter((x): x is ExternalLinkItem => x !== null);
}

/** Đối tác / OTA / bản đồ */
export function getPartnerLinks(): ExternalLinkItem[] {
  return [
    item(
      'booking',
      'Booking.com',
      'VITE_PARTNER_BOOKING_URL',
      'https://www.booking.com/',
      ExternalLink,
    ),
    item(
      'agoda',
      'Agoda',
      'VITE_PARTNER_AGODA_URL',
      'https://www.agoda.com/',
      ExternalLink,
    ),
    item(
      'traveloka',
      'Traveloka',
      'VITE_PARTNER_TRAVELOKA_URL',
      'https://www.traveloka.com/',
      ExternalLink,
    ),
    item('expedia', 'Expedia', 'VITE_PARTNER_EXPEDIA_URL', '', ExternalLink),
    item(
      'maps',
      'Google Maps',
      'VITE_GOOGLE_MAPS_URL',
      'https://www.google.com/maps/search/?api=1&query=Mango+Hotel+Da+Nang',
      MapPin,
    ),
  ].filter((x): x is ExternalLinkItem => x !== null);
}
