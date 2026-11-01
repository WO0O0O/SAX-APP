import { setSettings, useAudioSettings } from '../audio/settings.ts';

const field = 'rounded-md border border-paper-ink/25 bg-transparent px-2 py-1 text-sm';

/** Play / stop, tempo and sound for a line of notes (a scale), on a paper card. */
export function PlayScale({ playing, onToggle, bpm, setBpm, label = 'Play' }: { playing: boolean; onToggle: () => void; bpm: number; setBpm: (n: number) => void; label?: string }) {
  const { voice } = useAudioSettings();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={playing}
        className={`rounded-full px-4 py-1.5 font-semibold ${playing ? 'bg-wine text-paper' : 'bg-lookup text-paper hover:bg-lookup/85'}`}
      >
        {playing ? 'Stop' : label}
      </button>
      <label className="flex items-center gap-2">
        <span className="text-paper-ink/70">Tempo</span>
        <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className={`${field} w-16`} aria-label="Tempo in beats per minute" />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-paper-ink/70">Sound</span>
        <select value={voice} onChange={(e) => setSettings({ voice: e.target.value as 'reed' | 'piano' })} className={field}>
          <option value="reed">Reed</option>
          <option value="piano">Piano</option>
        </select>
      </label>
    </div>
  );
}
