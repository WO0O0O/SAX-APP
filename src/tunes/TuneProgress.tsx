import { useState } from 'react';
import { MILESTONES, updateTune, type Tune } from '../api.ts';

/** Editable milestone / tempo / no-chart flag. Saves on every change. */
export function TuneProgress({ tune, onSaved }: { tune: Tune; onSaved?: (t: Tune) => void }) {
  const [state, setState] = useState(tune);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const save = (patch: Partial<Tune>) => {
    const next = { ...state, ...patch };
    setState(next);
    updateTune(tune.id, { stage: next.stage, tempo: next.tempo, no_chart: Boolean(next.no_chart) })
      .then(() => {
        setStatus('saved');
        onSaved?.(next);
      })
      .catch(() => setStatus('error'));
  };

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-sm">
      <label className="flex min-w-[260px] flex-1 flex-col gap-1">
        <span className="caps-xs text-smoke-dim">Milestone</span>
        <select
          value={state.stage}
          onChange={(e) => save({ stage: Number(e.target.value) })}
          className="rounded-lg border border-walnut bg-ink/60 px-2.5 py-1.5"
        >
          {MILESTONES.map((m, i) => (
            <option key={i} value={i}>
              {i}. {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex w-28 flex-col gap-1">
        <span className="caps-xs text-smoke-dim">Best tempo</span>
        <input
          type="number"
          min={30}
          max={300}
          placeholder="bpm"
          value={state.tempo ?? ''}
          onChange={(e) => setState({ ...state, tempo: e.target.value ? Number(e.target.value) : null })}
          onBlur={() => save({})}
          className="rounded-lg border border-walnut bg-ink/60 px-2.5 py-1.5"
        />
      </label>
      <label className="flex items-center gap-2 pb-1.5">
        <input type="checkbox" checked={Boolean(state.no_chart)} onChange={(e) => save({ no_chart: e.target.checked ? 1 : 0 })} className="size-4 accent-ember" />
        Played without a finger chart
      </label>
      <span className="pb-1.5 text-xs text-smoke-dim" aria-live="polite">
        {status === 'saved' ? 'Saved' : status === 'error' ? 'Could not save (is the app server running?)' : ''}
      </span>
    </div>
  );
}
