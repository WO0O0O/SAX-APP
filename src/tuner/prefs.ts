import type { TuningMode } from './analysis.ts';

// Tuner settings, remembered per browser and shared by the Tuner and Reading's Listen mode.
export type TunerPrefs = { mode: TuningMode; a4: number; gate: number; fletcher: boolean };
const STORE = 'sax.tuner.v1';
export const TUNER_DEFAULTS: TunerPrefs = { mode: 'casual', a4: 440, gate: 0.012, fletcher: false };

export function loadTunerPrefs(): TunerPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<TunerPrefs> | null;
    if (v)
      return {
        mode: v.mode === 'pro' ? 'pro' : 'casual',
        a4: Math.min(445, Math.max(438, Number(v.a4) || 440)),
        gate: Math.min(0.06, Math.max(0.002, Number(v.gate) || TUNER_DEFAULTS.gate)),
        fletcher: Boolean(v.fletcher),
      };
  } catch {
    // defaults
  }
  return TUNER_DEFAULTS;
}

export function saveTunerPrefs(p: TunerPrefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {
    // not critical
  }
}
