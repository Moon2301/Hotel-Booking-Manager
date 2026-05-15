import { describe, it, expect } from 'vitest';
import { computeJsonDiff, DiffResult } from './json-diff';

describe('computeJsonDiff', () => {
  it('should return no changes for two empty objects', () => {
    const result = computeJsonDiff({}, {});

    expect(result).toEqual<DiffResult>({
      entries: [],
      hasChanges: false,
    });
  });

  it('should detect added keys', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2, c: 'hello' };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries).toContainEqual({ key: 'b', type: 'added', newValue: 2 });
    expect(result.entries).toContainEqual({ key: 'c', type: 'added', newValue: 'hello' });
  });

  it('should detect removed keys', () => {
    const before = { a: 1, b: 2, c: 'hello' };
    const after = { a: 1 };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries).toContainEqual({ key: 'b', type: 'removed', oldValue: 2 });
    expect(result.entries).toContainEqual({ key: 'c', type: 'removed', oldValue: 'hello' });
  });

  it('should detect changed values', () => {
    const before = { a: 1, b: 'old', c: true };
    const after = { a: 2, b: 'new', c: false };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(3);
    expect(result.entries).toContainEqual({ key: 'a', type: 'changed', oldValue: 1, newValue: 2 });
    expect(result.entries).toContainEqual({ key: 'b', type: 'changed', oldValue: 'old', newValue: 'new' });
    expect(result.entries).toContainEqual({ key: 'c', type: 'changed', oldValue: true, newValue: false });
  });

  it('should return no changes when objects are identical', () => {
    const before = { a: 1, b: 'hello', c: true };
    const after = { a: 1, b: 'hello', c: true };
    const result = computeJsonDiff(before, after);

    expect(result).toEqual<DiffResult>({
      entries: [],
      hasChanges: false,
    });
  });

  it('should handle nested objects using JSON.stringify comparison', () => {
    const before = { config: { theme: 'dark', lang: 'en' } };
    const after = { config: { theme: 'light', lang: 'en' } };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      key: 'config',
      type: 'changed',
      oldValue: { theme: 'dark', lang: 'en' },
      newValue: { theme: 'light', lang: 'en' },
    });
  });

  it('should detect no change for identical nested objects', () => {
    const nested = { x: [1, 2, 3], y: { z: true } };
    const before = { data: nested };
    const after = { data: { x: [1, 2, 3], y: { z: true } } };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(false);
    expect(result.entries).toHaveLength(0);
  });

  it('should handle null before input gracefully', () => {
    const result = computeJsonDiff(null, { a: 1, b: 2 });

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries).toContainEqual({ key: 'a', type: 'added', newValue: 1 });
    expect(result.entries).toContainEqual({ key: 'b', type: 'added', newValue: 2 });
  });

  it('should handle null after input gracefully', () => {
    const result = computeJsonDiff({ a: 1, b: 2 }, null);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries).toContainEqual({ key: 'a', type: 'removed', oldValue: 1 });
    expect(result.entries).toContainEqual({ key: 'b', type: 'removed', oldValue: 2 });
  });

  it('should handle both null inputs gracefully', () => {
    const result = computeJsonDiff(null, null);

    expect(result).toEqual<DiffResult>({
      entries: [],
      hasChanges: false,
    });
  });

  it('should handle undefined inputs gracefully', () => {
    const result = computeJsonDiff(undefined, undefined);

    expect(result).toEqual<DiffResult>({
      entries: [],
      hasChanges: false,
    });
  });

  it('should handle mixed add, remove, and change in one diff', () => {
    const before = { a: 1, b: 2, c: 3 };
    const after = { a: 10, c: 3, d: 4 };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toContainEqual({ key: 'a', type: 'changed', oldValue: 1, newValue: 10 });
    expect(result.entries).toContainEqual({ key: 'b', type: 'removed', oldValue: 2 });
    expect(result.entries).toContainEqual({ key: 'd', type: 'added', newValue: 4 });
    // 'c' should NOT be in the diff since it's unchanged
    expect(result.entries.find((e) => e.key === 'c')).toBeUndefined();
  });

  it('should handle arrays as values', () => {
    const before = { tags: ['a', 'b'] };
    const after = { tags: ['a', 'b', 'c'] };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      key: 'tags',
      type: 'changed',
      oldValue: ['a', 'b'],
      newValue: ['a', 'b', 'c'],
    });
  });

  it('should handle null values within objects', () => {
    const before = { a: null };
    const after = { a: 'value' };
    const result = computeJsonDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.entries).toContainEqual({
      key: 'a',
      type: 'changed',
      oldValue: null,
      newValue: 'value',
    });
  });
});
