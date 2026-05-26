import { Navigate } from 'react-router-dom';

/** Chuyển về mục phòng trên trang chủ */
export function RoomsPage() {
  return <Navigate to="/#rooms" replace />;
}
