import { describe, expect, it } from 'vitest';
import { fadeFor } from './known.ts';

describe('fadeFor', () => {
  it('shows names for notes with no history or few answers', () => {
    expect(fadeFor(undefined)).toBe(0);
    expect(fadeFor({ answered: 2, correct: 2, lookups: 0 })).toBe(0);
  });
  it('fades names the student reliably knows', () => {
    expect(fadeFor({ answered: 10, correct: 10, lookups: 1 })).toBe(0.85);
  });
  it('fades less when they still look the note up or miss it sometimes', () => {
    expect(fadeFor({ answered: 10, correct: 10, lookups: 6 })).toBe(0.5);
    expect(fadeFor({ answered: 10, correct: 8, lookups: 0 })).toBe(0.5);
  });
  it('keeps full names for weak notes', () => {
    expect(fadeFor({ answered: 10, correct: 4, lookups: 0 })).toBe(0);
  });
});
