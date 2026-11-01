import { useMemo } from 'react';
import { degreeLabel, guideLine, guideTones, type Chord } from '../../shared/chords.ts';
import { nameOf, pcOf, type Note } from '../../shared/theory.ts';
import { Score, type ScoreItem } from '../notation/Score.tsx';
import { NoteText } from '../ui/NoteText.tsx';

const sym = (s: string) => s.replace(/b(?=\d|$)/g, '♭').replace(/#/g, '♯');

/** One guide tone (3rd or 7th) per chord, always the nearest: the smooth line that runs through the changes. */
export function GuideLinePanel({ chords, onPlay, playing }: { chords: Chord[]; onPlay: (notes: Note[]) => void; playing: boolean }) {
  const line = useMemo(() => guideLine(chords), [chords]);
  const names = chords.filter((c) => guideTones(c).length);
  const bars = useMemo(() => {
    const per = 8;
    const out: ScoreItem[][] = [];
    for (let i = 0; i < line.length; i += per) out.push(line.slice(i, i + per).map((note) => ({ note, duration: 'w' as const })));
    return out;
  }, [line]);

  return (
    <section className="panel space-y-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Guide-tone line</h2>
          <p className="mt-1 text-sm text-smoke-dim">The 3rd or 7th of each chord, always the nearest one to the last note. Learn to play the changes as this line, then add the rest around it.</p>
        </div>
        <button type="button" onClick={() => onPlay(line)} disabled={playing} className="rounded-full border border-smoke/25 px-3.5 py-1.5 text-sm font-semibold hover:border-smoke/60 disabled:opacity-40">
          Play the line
        </button>
      </div>
      <div className="paper px-5 pt-3 pb-1">
        <Score bars={bars} barsPerLine={1} labels width={900} />
      </div>
      <ol className="flex flex-wrap gap-2 text-sm">
        {names.map((c, i) => {
          const note = line[i];
          const tone = guideTones(c).find((t) => pcOf(t.spelling) === note?.midi % 12);
          return (
            <li key={i} className="rounded-lg border border-walnut bg-ink/40 px-2.5 py-1">
              {sym(c.name)} <span className="text-smoke-dim">→</span> <strong>{note && <NoteText text={nameOf(note)} />}</strong>
              {tone && <span className="text-smoke-dim"> ({degreeLabel(tone.degree)})</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
