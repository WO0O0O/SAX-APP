import { useMemo } from 'react';
import { degreeLabel, guideMoves, guideTones, scaleFor, type Chord } from '../../shared/chords.ts';
import { nameOf, noteName } from '../../shared/theory.ts';
import { FingeringCard } from '../fingering/FingeringCard.tsx';
import { arpeggio, chordToneRange, openInScales, ROLE_COLORS } from '../music/chordTones.ts';
import { SCALES } from '../music/scales.ts';
import { Score, type ScoreItem } from '../notation/Score.tsx';
import { NoteText } from '../ui/NoteText.tsx';

const whole = (notes: ReturnType<typeof arpeggio>): ScoreItem[] => notes.map((note) => ({ note, duration: 'w' }));
const sym = (s: string) => s.replace(/b(?=\d|$)/g, '♭').replace(/#/g, '♯');
const btn = 'rounded-full border border-smoke/25 px-3 py-1 text-sm font-semibold text-smoke hover:border-smoke/60';

type Props = {
  chord: Chord;
  next: Chord | null;
  onClose: () => void;
  /** Phase 3: hear it. */
  onPlay?: (kind: 'arpeggio' | 'chord') => void;
  playing?: boolean;
};

/** What a chord is made of, how to play it, and where it leads. Opened by tapping a chord symbol on a chart. */
export function ChordPanel({ chord, next, onClose, onPlay, playing }: Props) {
  const guides = new Set(guideTones(chord).map((t) => t.degree));
  const arp = useMemo(() => arpeggio(chord), [chord]);
  const range = useMemo(() => chordToneRange(chord), [chord]);
  const scales = scaleFor(chord);
  const moves = next ? guideMoves(chord, next) : [];

  return (
    <section className="panel space-y-5 p-6" aria-label={`Chord ${chord.name}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="caps-xs text-smoke-dim">Chord</p>
          <h2 className="font-display text-4xl">
            <NoteText text={chord.name.replace(/b(?=\d|$)/g, '♭').replace(/#/g, '♯')} />
          </h2>
          <p className="mt-1 text-sm text-smoke-dim">Written pitch. Guide tones (3rd and 7th) are what define the chord.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onPlay && (
            <>
              <button type="button" className={btn} onClick={() => onPlay('arpeggio')} disabled={playing}>
                Play arpeggio
              </button>
              <button type="button" className={btn} onClick={() => onPlay('chord')} disabled={playing}>
                Play chord
              </button>
            </>
          )}
          <button type="button" className={btn} onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <ul className="flex flex-wrap gap-2" aria-label="Chord tones">
        {chord.tones.map((t) => {
          const guide = guides.has(t.degree);
          return (
            <li
              key={t.degree}
              className="min-w-[4.2rem] rounded-lg border-2 bg-ink/40 px-3 py-1.5 text-center"
              style={{ borderColor: ROLE_COLORS[t.role] }}
            >
              <span className="block text-xs text-smoke-dim">{t.degree === '1' ? 'root' : degreeLabel(t.degree)}</span>
              <span className="block text-lg font-semibold">
                <NoteText text={nameOf(t.spelling)} />
              </span>
              {guide && <span className="caps-xs text-ember">guide</span>}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="paper px-5 pt-3 pb-1">
          <p className="caps text-lookup">Arpeggio, one octave</p>
          <Score bars={[whole(arp)]} barsPerLine={1} labels width={520} />
        </div>
        <div className="paper px-5 pt-3 pb-1">
          <p className="caps text-lookup">Chord tones across your range</p>
          <Score
            bars={range.length > 8 ? [whole(range.slice(0, Math.ceil(range.length / 2))), whole(range.slice(Math.ceil(range.length / 2)))] : [whole(range)]}
            barsPerLine={1}
            labels
            width={520}
          />
        </div>
      </div>

      <div>
        <h3 className="caps-xs mb-2 text-smoke-dim">Fingerings</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {arp.slice(0, -1).map((n) => (
            <FingeringCard key={n.midi} note={n} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="caps-xs mb-2 text-smoke-dim">Scales that fit</h3>
          <ul className="space-y-2">
            {scales.map((s) => {
              const scale = SCALES.find((x) => x.id === s.id)!;
              return (
                <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>
                    <strong>
                      <NoteText text={nameOf(chord.root)} /> {scale.name}
                    </strong>
                    <span className="block text-smoke-dim">{s.why}</span>
                  </span>
                  <button type="button" className={btn} onClick={() => openInScales(chord.root, s.id)}>
                    Open in Scales
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="caps-xs mb-2 text-smoke-dim">{next ? `Moving to ${sym(next.name)}` : 'Guide tones'}</h3>
          {next ? (
            <ul className="space-y-1 text-sm">
              {moves.map((m) => (
                <li key={m.from.degree}>
                  <strong>
                    <NoteText text={nameOf(m.from.spelling)} />
                  </strong>{' '}
                  <span className="text-smoke-dim">({degreeLabel(m.from.degree)})</span>{' '}
                  {m.direction === 'same' ? (
                    <>
                      stays as <NoteText text={nameOf(m.to.spelling)} /> <span className="text-smoke-dim">({degreeLabel(m.to.degree)})</span>
                    </>
                  ) : (
                    <>
                      {m.direction === 'down' ? 'falls' : 'rises'} {m.semitones === 1 ? 'a half step' : `${m.semitones} half steps`} to{' '}
                      <strong>
                        <NoteText text={nameOf(m.to.spelling)} />
                      </strong>{' '}
                      <span className="text-smoke-dim">({degreeLabel(m.to.degree)})</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-smoke-dim">
              {guideTones(chord).map((t) => `${noteName({ ...t.spelling, octave: 4, midi: 60 }).replace(/\d/, '')} (${degreeLabel(t.degree)})`).join(', ')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
