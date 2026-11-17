import { describe, it, expect } from 'vitest';
import { normalizeEnvString } from '../src/utils/envString';

describe('normalizeEnvString', () => {
  it('strips matching single quotes', () => {
    expect(normalizeEnvString("'5%Cowek(W35X'")).toBe('5%Cowek(W35X');
  });

  it('strips leading quote when closing quote is missing', () => {
    expect(normalizeEnvString("'5%Cowek(W35X")).toBe('5%Cowek(W35X');
  });

  it('strips double quotes', () => {
    expect(normalizeEnvString('"secret"')).toBe('secret');
  });
});