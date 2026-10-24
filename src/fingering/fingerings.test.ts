import { describe, expect, it } from 'vitest';
import { FINGERINGS } from './fingerings.ts';

describe('fingerings', () => {
  it('covers every written note from low Bb (58) to high F# (90)', () => {
    for (let m = 58; m <= 90; m++) expect(FINGERINGS[m]?.length, `midi ${m}`).toBeGreaterThan(0);
  });

  it('matches the reference chart for key notes', () => {
    expect(FINGERINGS[67][0].keys).toEqual(['L1', 'L2', 'L3']); // G4
    expect(FINGERINGS[61][0].keys).toEqual(['L1', 'L2', 'L3', 'lowCs', 'R1', 'R2', 'R3', 'lowC']); // C#4
    expect(FINGERINGS[73][0].keys).toEqual([]); // C#5 open
    expect(FINGERINGS[85][0].keys).toEqual(['oct']); // C#6
    expect(FINGERINGS[87][0].keys).toEqual(['oct', 'palmD', 'palmEb']); // Eb6
  });

  it('second octave adds the octave key and keeps alternates', () => {
    expect(FINGERINGS[74][0].keys).toEqual(['oct', ...FINGERINGS[62][0].keys]);
    expect(FINGERINGS[82].map((f) => f.name)).toEqual(['Bis', '1 + 1', 'Side B♭']);
  });
});
