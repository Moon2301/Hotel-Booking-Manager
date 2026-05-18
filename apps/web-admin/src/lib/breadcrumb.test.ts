import { describe, it, expect } from 'vitest';
import { generateBreadcrumbs } from './breadcrumb';

describe('generateBreadcrumbs', () => {
  it('returns only Dashboard (no href) for root path', () => {
    const result = generateBreadcrumbs('/');
    expect(result).toEqual([{ label: 'Dashboard' }]);
  });

  it('returns Dashboard with href and current page for a single segment', () => {
    const result = generateBreadcrumbs('/properties');
    expect(result).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Properties' },
    ]);
  });

  it('maps known segments to their labels', () => {
    const result = generateBreadcrumbs('/room-board');
    expect(result).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Room Board' },
    ]);
  });

  it('handles nested paths with intermediate hrefs', () => {
    const result = generateBreadcrumbs(
      '/properties/550e8400-e29b-41d4-a716-446655440000/rooms'
    );
    expect(result).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Properties', href: '/properties' },
      {
        label: '550e8400-e29b-41d4-a716-446655440000',
        href: '/properties/550e8400-e29b-41d4-a716-446655440000',
      },
      { label: 'Rooms' },
    ]);
  });

  it('labels UUID-like segments with the ID itself', () => {
    const result = generateBreadcrumbs(
      '/properties/550e8400-e29b-41d4-a716-446655440000/rooms'
    );
    expect(result[2]).toEqual({
      label: '550e8400-e29b-41d4-a716-446655440000',
      href: '/properties/550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('last segment has no href', () => {
    const result = generateBreadcrumbs('/bookings/some-id');
    const lastSegment = result[result.length - 1];
    expect(lastSegment.href).toBeUndefined();
  });

  it('first segment is always Dashboard', () => {
    const result = generateBreadcrumbs('/payments');
    expect(result[0].label).toBe('Dashboard');
  });

  it('handles all known segment labels', () => {
    const knownSegments = [
      'properties',
      'room-board',
      'bookings',
      'payments',
      'reviews',
      'chat',
      'reports',
      'users',
      'audit-log',
      'room-types',
      'rooms',
      'rates',
      'policies',
    ];

    const expectedLabels = [
      'Properties',
      'Room Board',
      'Bookings',
      'Payments',
      'Reviews',
      'Chat',
      'Reports',
      'Users',
      'Audit Log',
      'Room Types',
      'Rooms',
      'Rates',
      'Policies',
    ];

    knownSegments.forEach((segment, i) => {
      const result = generateBreadcrumbs(`/${segment}`);
      expect(result[1].label).toBe(expectedLabels[i]);
    });
  });

  it('handles deeply nested paths', () => {
    const result = generateBreadcrumbs(
      '/properties/550e8400-e29b-41d4-a716-446655440000/room-types'
    );
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ label: 'Dashboard', href: '/' });
    expect(result[1]).toEqual({ label: 'Properties', href: '/properties' });
    expect(result[2]).toEqual({
      label: '550e8400-e29b-41d4-a716-446655440000',
      href: '/properties/550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result[3]).toEqual({ label: 'Room Types' });
  });

  it('handles empty path', () => {
    const result = generateBreadcrumbs('');
    expect(result).toEqual([{ label: 'Dashboard' }]);
  });

  it('handles path with trailing slash', () => {
    const result = generateBreadcrumbs('/properties/');
    expect(result).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Properties' },
    ]);
  });

  it('capitalizes unknown segments', () => {
    const result = generateBreadcrumbs('/some-unknown-page');
    expect(result[1].label).toBe('Some Unknown Page');
  });
});
