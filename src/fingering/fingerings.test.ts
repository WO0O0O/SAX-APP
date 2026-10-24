import { describe, expect, it } from 'vitest';
import { chromaticRange } from '../../shared/pitch.ts';
import { FINGERINGS } from './fingerings.ts';

describe('fingerings', () => {
  it('covers the student range except low C# (pending reference check)', () => {
    const missing = chromaticRange('C4', 'D#6').filter((p) => !FINGERINGS[p]);
    expect(missing).toEqual(['C#4']);
  });

  it('R1 notes are left hand only', () => {
    expect(FINGERINGS.G4).toEqual(['L1', 'L2', 'L3']);
    expect(FINGERINGS.A4).toEqual(['L1', 'L2']);
    expect(FINGERINGS.B4).toEqual(['L1']);
  });

  it('second octave adds the octave key', () => {
    expect(FINGERINGS.D5).toEqual(['oct', ...FINGERINGS.D4]);
    expect(FINGERINGS['C#6']).toEqual(['oct']);
  });
});
