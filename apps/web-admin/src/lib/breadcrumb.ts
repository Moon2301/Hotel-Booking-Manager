export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  properties: 'Properties',
  'room-board': 'Room Board',
  bookings: 'Bookings',
  payments: 'Payments',
  reviews: 'Reviews',
  chat: 'Chat',
  reports: 'Reports',
  users: 'Users',
  'audit-log': 'Audit Log',
  'room-types': 'Room Types',
  rooms: 'Rooms',
  rates: 'Rates',
  policies: 'Policies',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(segment: string): boolean {
  return UUID_REGEX.test(segment);
}

function formatSegmentLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment];
  }
  if (isUuidLike(segment)) {
    return segment;
  }
  // Capitalize first letter of each word, replace hyphens with spaces
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generates breadcrumb segments from a route path.
 *
 * @param path - The current pathname (e.g., '/properties/abc-123/rooms')
 * @returns An ordered array of breadcrumb segments. The last segment has no href.
 */
export function generateBreadcrumbs(path: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ label: 'Dashboard', href: '/' }];

  // Remove leading/trailing slashes and split
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  if (parts.length === 0) {
    // We're on the dashboard itself — last segment has no href
    segments[0] = { label: 'Dashboard' };
    return segments;
  }

  let currentPath = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath += `/${part}`;
    const isLast = i === parts.length - 1;

    const segment: BreadcrumbSegment = {
      label: formatSegmentLabel(part),
    };

    if (!isLast) {
      segment.href = currentPath;
    }

    segments.push(segment);
  }

  return segments;
}
