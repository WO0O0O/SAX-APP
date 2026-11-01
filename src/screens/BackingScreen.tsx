import { useEffect, useMemo, useState } from 'react';
import { parseChord } from '../../shared/chords.ts';
import { nameOf, parseSpelling, writtenToConcert } from '../../shared/theory.ts';
import { BAND_STYLES } from '../audio/band.ts';
import { BACKING_KEYS, PRESETS, presetChart } from '../music/presets.ts';
import { openInScales } from '../music/chordTones.ts';
import { parseChart } from '../music/chart.ts';
import { SCALES } from '../music/scales.ts';
import { Score } from '../notation/Score.tsx';
import { PlaybackBar } from '../tunes/PlaybackBar.tsx';
import { useTunePlayback } from '../tunes/useTunePlayback.ts';
import { NoteText } from '../ui/NoteText.tsx';
import { useNarrow } from '../ui/useNarrow.ts';
import '../notation/score.css';

const STORE = 'sax.backing.v1';
const sym = (s: string) => s.replace(/b(?=\d|$)/g, '♭').replace(/#/g, '♯');
const field = 'rounded-md border border-smoke/25 bg-ink/60 px-2 py-1.5 text-sm font-semibold';

/** Practice grooves: a band playing a common progression in any key, for you to improvise over. */
export default function BackingScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  useEffect(() => onSceneDim(0.55), [onSceneDim]);
  const [choice, setChoice] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) ?? 'null');
      if (v && PRESETS.some((p) => p.id === v.preset) && BACKING_KEYS.includes(v.key)) return v as { preset: string; key: string };
    } catch {
      // defaults
    }
    return { preset: 'blues', key: 'F' };
  });
  const pick = (patch: Partial<typeof choice>) =>
    setChoice((c) => {
      const next = { ...c, ...patch };
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        // not critical
      }
      return next;
    });

  const preset = PRESETS.find((p) => p.id === choice.preset)!;
  const chart = useMemo(() => parseChart(presetChart(preset, choice.key)), [preset, choice.key]);
  const pb = useTunePlayback(chart);
  const narrow = useNarrow();
  const root = parseSpelling(choice.key);
  const first = chart.chords[0]?.[0]?.name;
  const chordNames = useMemo(() => chart.chords.map((bar) => bar.map((c) => c.name)), [chart]);
  const valid = chordNames.flat().every((n) => parseChord(n));

  return (
    <div className="mx-auto grid w-full max-w-[1200px] items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="panel space-y-4 p-4">
        <div>
          <p className="caps-xs mb-2 px-1 text-smoke-dim">Groove</p>
          <ul>
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={p.id === preset.id ? 'true' : undefined}
                  onClick={() => pick({ preset: p.id })}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors ${p.id === preset.id ? 'bg-ember/20 text-smoke' : 'text-smoke/80 hover:bg-smoke/5 hover:text-smoke'}`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <label className="block">
          <span className="caps-xs mb-1 block px-1 text-smoke-dim">Key (written)</span>
          <select value={choice.key} onChange={(e) => pick({ key: e.target.value })} className={`${field} w-full`} aria-label="Key">
            {BACKING_KEYS.map((k) => (
              <option key={k} value={k}>
                {sym(k)} (sounds {nameOf(writtenToConcert(parseSpelling(k)))})
              </option>
            ))}
          </select>
        </label>
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="panel p-6">
          <h1 className="font-display text-4xl">
            {preset.name} in <NoteText text={nameOf(root)} />
          </h1>
          <p className="mt-2 text-smoke-dim">{preset.blurb}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-smoke-dim">Play over it with:</span>
            {preset.scales.map((id) => {
              const scale = SCALES.find((s) => s.id === id)!;
              return (
                <button key={id} type="button" onClick={() => openInScales(root, id)} className="rounded-full border border-smoke/25 px-3 py-1 font-semibold hover:border-smoke/60">
                  <NoteText text={nameOf(root)} /> {scale.name}
                </button>
              );
            })}
          </div>
        </section>

        <article className="paper px-5 pt-4 pb-2">
          <p className="caps text-lookup">Changes · written pitch · {BAND_STYLES.find((b) => b.id === pb.band)?.label ?? 'choose a band below'}</p>
          <PlaybackBar pb={pb} canPlayFrom={false} onPlayFrom={() => {}} />
          {valid && (
            <Score
              bars={chart.bars}
              chords={chart.chords}
              barsPerLine={narrow ? 2 : 4}
              timeSig="4/4"
              keySig={chart.keySig}
              activeChord={pb.playing && pb.bar !== undefined ? { bar: pb.bar % chart.bars.length, index: 0 } : undefined}
              width={980}
            />
          )}
          <p className="pb-2 text-xs text-paper-ink/60">{first ? `Starts on ${sym(first)}. ` : ''}Loop a few bars with "Loop bars"; turn on "Speed up" to build the tempo.</p>
        </article>
      </div>
    </div>
  );
}
