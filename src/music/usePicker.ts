import { useEffect, useState } from 'react';
import { CIRCLE, SCALES, type Scale } from './scales.ts';

// Shared key + scale choice (Scales and Reading screens), remembered per browser.
const STORE = 'sax.picker.v1';

type Picked = { pos: number; alt: boolean; scaleId: string };

function load(): Picked {
  try {
    const p = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Picked | null;
    if (p && p.pos >= 0 && p.pos < 12 && SCALES.some((s) => s.id === p.scaleId)) return p;
  } catch {
    // storage unavailable: fall through to defaults
  }
  return { pos: 0, alt: false, scaleId: 'major' };
}

export function usePicker() {
  const [picked, setPicked] = useState<Picked>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(picked));
    } catch {
      // not critical
    }
  }, [picked]);

  const names = CIRCLE[picked.pos];
  const tonic = picked.alt && names[1] ? names[1] : names[0];
  const scale = SCALES.find((s) => s.id === picked.scaleId) as Scale;

  return {
    pos: picked.pos,
    tonic,
    altName: names[1] ? (picked.alt ? names[0] : names[1]) : undefined,
    scale,
    setPos: (pos: number) => setPicked((p) => ({ ...p, pos, alt: false })),
    toggleSpelling: () => setPicked((p) => ({ ...p, alt: !p.alt })),
    setScale: (scaleId: string) => setPicked((p) => ({ ...p, scaleId })),
  };
}
