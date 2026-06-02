import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { capturePartnerRefFromSearch } from '../lib/partner-referral';

/** Ghi nhận ?ref= / ?partner= trên mọi trang guest. */
export function PartnerReferralCapture() {
  const location = useLocation();

  useEffect(() => {
    capturePartnerRefFromSearch(location.search);
  }, [location.search]);

  return null;
}
