import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cache } from '../src/utils/cache';

describe('MemoryCache', () => {
  beforeEach(() => {
    cache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    cache.set('key', { count: 1 }, 60_000);
    expect(cache.get<{ count: number }>('key')).toEqual({ count: 1 });
  });

  it('expires entries after TTL', () => {
    cache.set('key', 'value', 1_000);
    vi.advanceTimersByTime(1_001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('deletes by prefix', () => {
    cache.set('tags:tenant-1', ['a'], 60_000);
    cache.set('tags:tenant-2', ['b'], 60_000);
    cache.set('analytics:tenant-1', {}, 60_000);

    cache.deleteByPrefix('tags:');

    expect(cache.get('tags:tenant-1')).toBeUndefined();
    expect(cache.get('tags:tenant-2')).toBeUndefined();
    expect(cache.get('analytics:tenant-1')).toBeDefined();
  });
});
