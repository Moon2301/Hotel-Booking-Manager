import { Navigate } from 'react-router-dom';

/** Chuyển về mục tiện ích trên trang chủ */
export function ServicesPage() {
  return <Navigate to="/#amenities" replace />;
}
