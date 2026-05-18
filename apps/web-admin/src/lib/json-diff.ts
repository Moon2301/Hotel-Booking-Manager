/**
 * JSON Diff Utility
 *
 * Compares two JSON objects and identifies added, removed, and changed keys.
 * Uses JSON.stringify for deep comparison of values (flat comparison for MVP).
 */

export interface DiffEntry {
  key: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffResult {
  entries: DiffEntry[];
  hasChanges: boolean;
}

/**
 * Computes the diff between two JSON objects.
 *
 * - 'added': key exists in `after` but not in `before`
 * - 'removed': key exists in `before` but not in `after`
 * - 'changed': key exists in both but values differ (deep comparison via JSON.stringify)
 *
 * Handles null/undefined inputs gracefully by treating them as empty objects.
 */
export function computeJsonDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): DiffResult {
  const safeBefore: Record<string, unknown> = before ?? {};
  const safeAfter: Record<string, unknown> = after ?? {};

  const entries: DiffEntry[] = [];

  const beforeKeys = Object.keys(safeBefore);
  const afterKeys = Object.keys(safeAfter);
  const afterKeySet = new Set(afterKeys);

  // Check for removed and changed keys
  for (const key of beforeKeys) {
    if (!(key in safeAfter)) {
      entries.push({
        key,
        type: 'removed',
        oldValue: safeBefore[key],
      });
    } else {
      const oldVal = safeBefore[key];
      const newVal = safeAfter[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        entries.push({
          key,
          type: 'changed',
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }

  // Check for added keys
  for (const key of afterKeys) {
    if (!(key in safeBefore)) {
      entries.push({
        key,
        type: 'added',
        newValue: safeAfter[key],
      });
    }
  }

  return {
    entries,
    hasChanges: entries.length > 0,
  };
}
