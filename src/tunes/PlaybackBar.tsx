import { setSettings, useAudioSettings } from '../audio/settings.ts';
import type { Swing } from '../audio/tunePlan.ts';
import type { Playback } from './useTunePlayback.ts';

const field = 'rounded-md border border-paper-ink/25 bg-transparent px-2 py-1 text-sm';

/** Play controls shown on the paper card above a chart. Small controls on purpose. */
export function PlaybackBar({ pb, canPlayFrom, onPlayFrom, band }: { pb: Playback; canPlayFrom: boolean; onPlayFrom: () => void; band?: React.ReactNode }) {
  const { voice } = useAudioSettings();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-paper-ink/10 py-2 text-sm">
      <button
        type="button"
        onClick={() => (pb.playing ? pb.stop() : pb.start())}
        className={`rounded-full px-4 py-1.5 font-semibold ${pb.playing ? 'bg-wine text-paper' : 'bg-lookup text-paper hover:bg-lookup/85'}`}
        aria-pressed={pb.playing}
      >
        {pb.playing ? 'Stop' : 'Play'}
      </button>
      {canPlayFrom && !pb.playing && (
        <button type="button" onClick={onPlayFrom} className="text-lookup hover:underline">
          Play from selected note
        </button>
      )}
      <label className="flex items-center gap-2">
        <span className="text-paper-ink/70">Tempo</span>
        <input type="range" min={40} max={220} value={pb.bpm} onChange={(e) => pb.setBpm(Number(e.target.value))} className="hidden w-28 accent-lookup sm:block" aria-label="Tempo" />
        <input type="number" min={40} max={220} value={pb.bpm} onChange={(e) => pb.setBpm(Number(e.target.value))} className={`${field} w-16`} aria-label="Tempo in beats per minute" />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-paper-ink/70">Feel</span>
        <select value={pb.swing} onChange={(e) => pb.setSwing(e.target.value as Swing)} className={field}>
          <option value="off">Straight</option>
          <option value="light">Light swing</option>
          <option value="full">Swing</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-paper-ink/70">Sound</span>
        <select value={voice} onChange={(e) => setSettings({ voice: e.target.value as 'reed' | 'piano' })} className={field}>
          <option value="reed">Reed</option>
          <option value="piano">Piano</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={pb.countIn} onChange={(e) => pb.setCountIn(e.target.checked)} className="size-4 accent-lookup" />
        Count-in
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={pb.click} onChange={(e) => pb.setClick(e.target.checked)} className="size-4 accent-lookup" />
        Click
      </label>
      <span className="flex items-center gap-1.5">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={pb.loop} onChange={(e) => pb.setLoop(e.target.checked)} className="size-4 accent-lookup" />
          Loop bars
        </label>
        {pb.loop && (
          <>
            <input type="number" min={1} max={pb.bars} value={pb.from} onChange={(e) => pb.setFrom(Math.max(1, Math.min(Number(e.target.value) || 1, pb.bars)))} className={`${field} w-14`} aria-label="Loop from bar" />
            <span>to</span>
            <input type="number" min={1} max={pb.bars} value={pb.to} onChange={(e) => pb.setTo(Math.max(pb.from, Math.min(Number(e.target.value) || pb.bars, pb.bars)))} className={`${field} w-14`} aria-label="Loop to bar" />
          </>
        )}
      </span>
      {band}
    </div>
  );
}
