/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_FACEBOOK_URL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_YOUTUBE_URL?: string;
  readonly VITE_TIKTOK_URL?: string;
  readonly VITE_LINKEDIN_URL?: string;
  readonly VITE_PARTNER_BOOKING_URL?: string;
  readonly VITE_PARTNER_AGODA_URL?: string;
  readonly VITE_PARTNER_TRAVELOKA_URL?: string;
  readonly VITE_PARTNER_EXPEDIA_URL?: string;
  readonly VITE_GOOGLE_MAPS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
