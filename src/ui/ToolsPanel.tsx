import { useEffect } from 'react';
import { droneMidi, tools, useTools } from '../audio/tools.ts';
import { namesOf } from '../music/quiz.ts';
import { NoteText } from './NoteText.tsx';

const NOTES = ['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B'];
const field = 'rounded-md border border-smoke/25 bg-ink/60 px-2 py-1 text-sm';
const btn = 'rounded-full border border-smoke/25 px-3 py-1 text-sm font-semibold text-smoke hover:border-smoke/60';
const btnOn = 'rounded-full bg-ember px-4 py-1 text-sm font-semibold text-ink hover:bg-ember/85';

/** Header button for the tools panel; shows a dot while the drone or metronome is running. */
export function ToolsButton() {
  const t = useTools();
  return (
    <button
      type="button"
      onClick={tools.toggleOpen}
      aria-expanded={t.open}
      className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${t.open ? 'bg-smoke text-ink' : 'bg-ink/70 text-smoke-dim hover:text-smoke'}`}
    >
      Tools
      {(t.droneOn || t.metroOn) && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-ember" aria-label="running" />}
    </button>
  );
}

/** Drone and metronome. They keep running while you change tabs. */
export function ToolsPanel() {
  const t = useTools();

  // Space starts and stops the metronome while this panel is open (unless you're typing or on a button).
  useEffect(() => {
    if (!t.open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== ' ' || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) return;
      e.preventDefault();
      tools.toggleMetro();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t.open]);

  if (!t.open) return null;
  const written = droneMidi(t.dronePc, t.droneOctave);

  return (
    <aside className="panel fixed right-3 bottom-3 z-30 w-[min(360px,calc(100vw-1.5rem))] space-y-4 p-4" style={{ background: 'var(--color-mahogany)' }} aria-label="Tools">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Tools</h2>
        <button type="button" className={btn} onClick={() => tools.open(false)}>
          Close
        </button>
      </div>

      <section aria-label="Drone" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="caps-xs text-smoke-dim">Drone</h3>
          <button type="button" className={t.droneOn ? btnOn : btn} onClick={tools.toggleDrone} aria-pressed={t.droneOn}>
            {t.droneOn ? 'Stop' : 'Start'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={t.dronePc} onChange={(e) => tools.set({ dronePc: Number(e.target.value) })} className={field} aria-label="Drone note">
            {NOTES.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
          <select value={t.droneOctave} onChange={(e) => tools.set({ droneOctave: Number(e.target.value) })} className={field} aria-label="Octave">
            {[3, 4, 5].map((o) => (
              <option key={o} value={o}>
                octave {o}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={t.droneFifth} onChange={(e) => tools.set({ droneFifth: e.target.checked })} className="size-4 accent-ember" />
            + fifth
          </label>
        </div>
        <p className="text-xs text-smoke-dim">
          Written <NoteText text={namesOf(written)} /> sounds <NoteText text={namesOf(written - 9)} />. Play it on the horn against the drone.
        </p>
        <input type="range" min={0.1} max={1} step={0.05} value={t.droneVolume} onChange={(e) => tools.set({ droneVolume: Number(e.target.value) })} className="w-full accent-ember" aria-label="Drone volume" />
      </section>

      <section aria-label="Metronome" className="space-y-2 border-t border-walnut/70 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="caps-xs text-smoke-dim">Metronome</h3>
          <button type="button" className={t.metroOn ? btnOn : btn} onClick={tools.toggleMetro} aria-pressed={t.metroOn}>
            {t.metroOn ? 'Stop' : 'Start'} <kbd className="ml-1 opacity-60">space</kbd>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btn} onClick={() => tools.set({ bpm: Math.max(40, t.bpm - 1) })} aria-label="Slower">
            −
          </button>
          <input type="number" min={40} max={220} value={t.bpm} onChange={(e) => tools.set({ bpm: Math.max(40, Math.min(220, Number(e.target.value) || 80)) })} className={`${field} w-16 text-center`} aria-label="Beats per minute" />
          <button type="button" className={btn} onClick={() => tools.set({ bpm: Math.min(220, t.bpm + 1) })} aria-label="Faster">
            +
          </button>
          <button type="button" className={btn} onClick={tools.tap}>
            Tap
          </button>
        </div>
        <input type="range" min={40} max={220} value={t.bpm} onChange={(e) => tools.set({ bpm: Number(e.target.value) })} className="w-full accent-ember" aria-label="Tempo" />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={t.beats} onChange={(e) => tools.set({ beats: Number(e.target.value) })} className={field} aria-label="Beats per bar">
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} beats
              </option>
            ))}
          </select>
          <select value={t.sub} onChange={(e) => tools.set({ sub: e.target.value as typeof t.sub })} className={field} aria-label="Subdivision">
            <option value="none">Quarters</option>
            <option value="eighths">Eighths</option>
            <option value="triplets">Triplets</option>
          </select>
          {t.sub === 'eighths' && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={t.swing} onChange={(e) => tools.set({ swing: e.target.checked })} className="size-4 accent-ember" />
              swing
            </label>
          )}
        </div>
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: t.beats }, (_, i) => (
            <span key={i} className={`size-3.5 rounded-full border border-smoke/30 transition-colors duration-75 ${t.beat === i ? (i === 0 ? 'bg-ember' : 'bg-smoke') : 'bg-transparent'}`} />
          ))}
        </div>
      </section>
    </aside>
  );
}
