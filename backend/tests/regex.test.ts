import { describe, it, expect } from 'vitest';
import { escapeRegExp } from '../src/utils/regex';

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('hello.world')).toBe('hello\\.world');
    expect(escapeRegExp('(test)')).toBe('\\(test\\)');
    expect(escapeRegExp('a+b*c?')).toBe('a\\+b\\*c\\?');
  });

  it('leaves plain alphanumeric strings unchanged', () => {
    expect(escapeRegExp('john doe')).toBe('john doe');
    expect(escapeRegExp('919876543210')).toBe('919876543210');
  });

  it('prevents regex injection patterns', () => {
    expect(escapeRegExp('.*')).toBe('\\.\\*');
    expect(escapeRegExp('^$')).toBe('\\^\\$');
  });
});
