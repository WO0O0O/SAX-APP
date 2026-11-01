import { useSyncExternalStore } from 'react';
import type { Voice } from './voices.ts';

// Sound preferences, remembered per browser.
export type AudioSettings = {
  /** Tapping a note or key plays it. */
  tapSounds: boolean;
  voice: Voice;
  /** 0-1 */
  volume: number;
};

const STORE = 'sax.audio.v1';
const DEFAULTS: AudioSettings = { tapSounds: true, voice: 'reed', volume: 0.8 };

function read(): AudioSettings {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<AudioSettings> | null;
    if (v) return { ...DEFAULTS, ...v, voice: v.voice === 'piano' ? 'piano' : 'reed', volume: Math.min(1, Math.max(0, Number(v.volume ?? DEFAULTS.volume))) };
  } catch {
    // defaults
  }
  return DEFAULTS;
}

let current = read();
const listeners = new Set<() => void>();

export const getSettings = () => current;
export function setSettings(patch: Partial<AudioSettings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORE, JSON.stringify(current));
  } catch {
    // not critical
  }
  listeners.forEach((l) => l());
}
export const useAudioSettings = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSettings,
  );
