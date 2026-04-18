/**
 * Tests for src/lib/audit.ts — diff computation.
 */
import { describe, it, expect } from 'vitest';
import { computeDiff } from '@/lib/audit';

describe('computeDiff', () => {
  it('returns undefined when both are null', () => {
    expect(computeDiff(null, null)).toBeUndefined();
  });

  it('returns undefined when old is null', () => {
    expect(computeDiff(null, { foo: 'bar' })).toBeUndefined();
  });

  it('returns undefined when new is null', () => {
    expect(computeDiff({ foo: 'bar' }, null)).toBeUndefined();
  });

  it('returns undefined for identical objects', () => {
    const obj = { name: 'test', value: 123, arr: [1, 2] };
    expect(computeDiff(obj, { ...obj })).toBeUndefined();
  });

  it('detects changed string field', () => {
    const diff = computeDiff({ name: 'old' }, { name: 'new' });
    expect(diff).toBeDefined();
    expect(diff!.name).toEqual({ old: 'old', new: 'new' });
  });

  it('detects added field', () => {
    const diff = computeDiff({ a: 1 }, { a: 1, b: 2 });
    expect(diff).toBeDefined();
    expect(diff!.b).toEqual({ old: undefined, new: 2 });
  });

  it('detects removed field', () => {
    const diff = computeDiff({ a: 1, b: 2 }, { a: 1 });
    expect(diff).toBeDefined();
    expect(diff!.b).toEqual({ old: 2, new: undefined });
  });

  it('skips id and organ fields', () => {
    const diff = computeDiff(
      { id: 'old-id', organ: 'old-organ', name: 'same' },
      { id: 'new-id', organ: 'new-organ', name: 'same' },
    );
    expect(diff).toBeUndefined();
  });

  it('detects array changes', () => {
    const diff = computeDiff(
      { tags: ['a', 'b'] },
      { tags: ['a', 'c'] },
    );
    expect(diff).toBeDefined();
    expect(diff!.tags.old).toEqual(['a', 'b']);
    expect(diff!.tags.new).toEqual(['a', 'c']);
  });
});
