import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseChord } from '../../shared/chords.ts';
import { noteName, nameOf, parseSpelling, type Note } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { getNotes, getQuizStats, getTunes, loadChart, logLookup, MILESTONES, openPdf, slugOf, type Tune } from '../api.ts';
import { previewNote } from '../audio/engine.ts';
import { getSettings } from '../audio/settings.ts';
import { FingeringCard } from '../fingering/FingeringCard.tsx';
import { FingeringDiagram } from '../fingering/FingeringDiagram.tsx';
import { FINGERINGS, describe } from '../fingering/fingerings.ts';
import { parseChart, type Chart, type ChartFile } from '../music/chart.ts';
import { arpeggio, ROLE_COLORS, ROLE_NAMES, toneColors } from '../music/chordTones.ts';
import { fadeFor } from '../music/known.ts';
import type { Stats } from '../music/quiz.ts';
import { keyChoices, transposeChart } from '../music/transpose.ts';
import { Score } from '../notation/Score.tsx';
import { ChordPanel } from '../tunes/ChordPanel.tsx';
import { PlaybackBar } from '../tunes/PlaybackBar.tsx';
import { TuneProgress } from '../tunes/TuneProgress.tsx';
import { useTunePlayback } from '../tunes/useTunePlayback.ts';
import { NoteText } from '../ui/NoteText.tsx';
import { UnlockPanel } from '../ui/UnlockPanel.tsx';
import { useNarrow } from '../ui/useNarrow.ts';
import { HOSTED } from '../mode.ts';
import { LockedError } from '../sealed.ts';
import '../notation/score.css';

const LOOKUP = '#9a5410';
const STORE = 'sax.tune.v1';
const outsideRange = (n: Note) => n.midi < STUDENT_RANGE.low || n.midi > STUDENT_RANGE.high;
const sym = (s: string) => s.replace(/b(?=\d|$)/g, '♭').replace(/#/g, '♯');

export default function TunesScreen({ onSceneDim }: { onSceneDim: (dim: number) => void }) {
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [tuneId, setTuneId] = useState<number | null>(() => {
    try {
      return Number(localStorage.getItem(STORE)) || null;
    } catch {
      return null;
    }
  });
  const [chart, setChart] = useState<Chart | null | 'missing' | 'locked'>(null);
  const [reload, setReload] = useState(0);
  const narrow = useNarrow();
  const [labels, setLabels] = useState(true);
  const [selected, setSelected] = useState<number | undefined>();
  const [looked, setLooked] = useState<Record<number, string>>({});
  const [chordSel, setChordSel] = useState<{ bar: number; index: number } | undefined>();
  const [colourTones, setColourTones] = useState(false);
  const [semis, setSemis] = useState(0);
  const [stats, setStats] = useState<Stats>({});
  const [fadeKnown, setFadeKnown] = useState(true);
  const [fadeAll, setFadeAll] = useState(0); // online: a hand-set slider

  useEffect(() => onSceneDim(0.5), [onSceneDim]);
  useEffect(() => {
    getTunes().then(setTunes).catch(() => setTunes([]));
  }, []);
  // What the student knows (Mac only), for fading note names.
  useEffect(() => {
    Promise.all([getQuizStats(), getNotes()]).then(([quiz, notes]) => {
      const s: Stats = {};
      for (const n of notes) s[n.midi] = { answered: 0, correct: 0, lookups: n.lookups };
      for (const q of quiz) s[q.midi] = { ...(s[q.midi] ?? { lookups: 0 }), answered: q.answered, correct: q.correct };
      setStats(s);
    });
  }, []);

  const tune = tunes.find((t) => t.id === tuneId) ?? tunes[0];

  useEffect(() => {
    if (!tune) return;
    try {
      localStorage.setItem(STORE, String(tune.id));
    } catch {
      // not critical
    }
    setChart(null);
    setSelected(undefined);
    setLooked({});
    setChordSel(undefined);
    setSemis(0);
    loadChart<ChartFile>(slugOf(tune.title))
      .then((file) => setChart(parseChart(file)))
      .catch((e) => setChart(e instanceof LockedError ? 'locked' : 'missing'));
  }, [tune?.id, reload]);

  const original = chart && typeof chart === 'object' ? chart : null;
  const loaded = useMemo(() => (original ? transposeChart(original, semis) : null), [original, semis]);
  const choices = useMemo(() => (original ? keyChoices(original.keySig) : []), [original]);
  const items = useMemo(() => (loaded ? loaded.bars.flat() : []), [loaded]);
  const uniqueNotes = useMemo(() => {
    const byMidi = new Map(items.filter((it) => it.note).map((it) => [it.note!.midi, it.note!]));
    return [...byMidi.values()].sort((a, b) => a.midi - b.midi);
  }, [items]);
  const stretch = uniqueNotes.filter(outsideRange).length;

  const chordList = useMemo(
    () =>
      loaded
        ? loaded.chords.flatMap((cs, bar) => cs.map((c, index) => ({ bar, index, chord: parseChord(c.name) }))).filter((c) => c.chord)
        : [],
    [loaded],
  );
  const hasChords = chordList.length > 0;
  const chordPos = chordSel ? chordList.findIndex((c) => c.bar === chordSel.bar && c.index === chordSel.index) : -1;
  const tones = useMemo(() => (loaded && colourTones ? toneColors(loaded) : {}), [loaded, colourTones]);
  const colors = useMemo(() => ({ ...tones, ...looked }), [tones, looked]);
  const labelFade = useCallback(
    (n: Note) => (HOSTED ? fadeAll : fadeKnown ? fadeFor(stats[n.midi]) : 0),
    [fadeKnown, fadeAll, stats],
  );

  const pb = useTunePlayback(loaded);

  const onTap = useCallback(
    (i: number) => {
      const note = items[i]?.note;
      if (!note) return;
      setSelected(i);
      if (getSettings().tapSounds && !pb.playing) previewNote(note.midi);
      if (!looked[i]) {
        setLooked((l) => ({ ...l, [i]: LOOKUP }));
        logLookup(note.midi);
      }
    },
    [items, looked, pb.playing],
  );

  // While playing, the fingering panel follows the cursor.
  const shownIndex = pb.playing && pb.cursor !== undefined ? pb.cursor : selected;
  const note = shownIndex !== undefined ? items[shownIndex]?.note : undefined;
  const fingering = note ? FINGERINGS[note.midi]?.[0] : undefined;

  const playChord = (kind: 'arpeggio' | 'chord') => {
    const chord = chordList[chordPos]?.chord;
    if (!chord) return;
    const arp = arpeggio(chord);
    if (kind === 'arpeggio') pb.playNotes(arp, 'line');
    else pb.playNotes(arp.slice(0, -1), 'chord');
  };

  return (
    <div className="mx-auto grid w-full max-w-[1400px] items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="panel p-3 lg:sticky lg:top-4">
        <p className="caps-xs px-2 pt-1 pb-2 text-smoke-dim">Your tunes</p>
        <ul>
          {tunes.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={t.id === tune?.id ? 'true' : undefined}
                onClick={() => setTuneId(t.id)}
                className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors ${
                  t.id === tune?.id ? 'bg-ember/20 text-smoke' : 'text-smoke/80 hover:bg-smoke/5 hover:text-smoke'
                }`}
              >
                <span className="block">{t.title}</span>
                <span className="block text-xs text-smoke-dim">
                  {t.stage > 0 ? `Milestone ${t.stage}/5` : t.status === 'active' ? 'Learning' : 'Later'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {tune && (
        <div className="min-w-0 space-y-5">
          <section className="panel p-6">
            <h1 className="font-display text-4xl">{tune.title}</h1>
            {loaded && original && (
              <p className="mt-1 text-smoke-dim">
                {semis === 0 ? (
                  <>
                    Written for alto in <span className="text-smoke">{loaded.writtenKey}</span> (concert {loaded.concertKey})
                  </>
                ) : (
                  <>
                    Transposed {semis > 0 ? 'up' : 'down'} {Math.abs(semis)} {Math.abs(semis) === 1 ? 'semitone' : 'semitones'} (key signature{' '}
                    <span className="text-smoke">
                      <NoteText text={nameOf(parseSpelling(loaded.keySig))} />
                    </span>
                    )
                  </>
                )}{' '}
                · {loaded.arranger}
                {loaded.pdf && (
                  <>
                    {' · '}
                    <button type="button" className="text-brass hover:underline" onClick={() => openPdf(loaded.pdf!)}>
                      Original PDF
                    </button>
                  </>
                )}
              </p>
            )}
            {HOSTED ? (
              <p className="mt-3 text-xs text-smoke-dim">Milestones and tempo are saved on your Mac (run `sax` there).</p>
            ) : (
              <>
                <div className="mt-4">
                  <TuneProgress key={tune.id} tune={tune} onSaved={(t) => setTunes((all) => all.map((x) => (x.id === t.id ? t : x)))} />
                </div>
                <p className="mt-2 text-xs text-smoke-dim">Next milestone: {MILESTONES[Math.min(tune.stage + 1, 5)]}</p>
              </>
            )}
          </section>

          {chart === 'locked' && <UnlockPanel onUnlocked={() => setReload((r) => r + 1)} />}

          {chart === 'missing' && HOSTED && (
            <section className="panel p-6 text-smoke-dim">
              No chart published for this tune. On the Mac: transcribe it, run <code className="text-smoke">npm run seal</code>, commit and push.
            </section>
          )}

          {chart === 'missing' && !HOSTED && (
            <section className="panel p-6 text-smoke-dim">
              No chart for this tune yet. Put the PDF in <code className="text-smoke">sheet-music/</code> and ask Claude to transcribe it into{' '}
              <code className="text-smoke">sheet-music/{slugOf(tune.title)}.tune.json</code>.
            </section>
          )}

          {loaded && (
            <>
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
                <article className="paper px-5 pt-4 pb-2">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <p className="caps text-lookup">Chart · tap a note for its fingering{hasChords ? ' · tap a chord for its notes' : ''}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <label className="flex items-center gap-2">
                        <span className="text-paper-ink/70">Key</span>
                        <select value={semis} onChange={(e) => setSemis(Number(e.target.value))} className="rounded-md border border-paper-ink/25 bg-transparent px-2 py-1" aria-label="Transpose">
                          {choices.map((c) => (
                            <option key={c.semis} value={c.semis}>
                              {c.semis === 0 ? 'Original' : `${c.semis > 0 ? '+' : '−'}${Math.abs(c.semis)} · ${sym(c.keySig)}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      {hasChords && (
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={colourTones} onChange={(e) => setColourTones(e.target.checked)} className="size-4 accent-lookup" />
                          Colour chord tones
                        </label>
                      )}
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="size-4 accent-lookup" />
                        Note names
                      </label>
                      {labels &&
                        (HOSTED ? (
                          <label className="flex items-center gap-2">
                            <span className="text-paper-ink/70">Fade</span>
                            <input type="range" min={0} max={0.9} step={0.05} value={fadeAll} onChange={(e) => setFadeAll(Number(e.target.value))} className="w-20 accent-lookup" aria-label="Fade note names" />
                          </label>
                        ) : (
                          <label className="flex items-center gap-2" title="Names fade for notes you answer correctly in the quiz and rarely look up">
                            <input type="checkbox" checked={fadeKnown} onChange={(e) => setFadeKnown(e.target.checked)} className="size-4 accent-lookup" />
                            Fade names I know
                          </label>
                        ))}
                    </div>
                  </header>
                  <PlaybackBar
                    pb={pb}
                    canPlayFrom={selected !== undefined && Boolean(items[selected]?.note)}
                    onPlayFrom={() => pb.start(selected)}
                  />
                  {stretch > 0 && semis !== 0 && (
                    <p className="mt-2 text-xs text-paper-ink/65">
                      {stretch} {stretch === 1 ? 'note falls' : 'notes fall'} outside your range ({STUDENT_RANGE.lowName}–{STUDENT_RANGE.highName}); they are fingered but greyed in the list below.
                    </p>
                  )}
                  {colourTones && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Colour key">
                      {(['root', 'third', 'fifth', 'seventh', 'extension'] as const).map((r) => (
                        <li key={r} className="flex items-center gap-1.5">
                          <span className="inline-block size-2.5 rounded-full" style={{ background: ROLE_COLORS[r] }} />
                          {ROLE_NAMES[r]}
                        </li>
                      ))}
                      <li className="text-paper-ink/60">black = not a chord tone</li>
                    </ul>
                  )}
                  <Score
                    bars={loaded.bars}
                    chords={loaded.chords}
                    barsPerLine={narrow ? 2 : loaded.timeSig === '12/8' ? 3 : 4}
                    timeSig={loaded.timeSig ?? '4/4'}
                    keySig={loaded.keySig}
                    labels={labels}
                    labelFade={labelFade}
                    colors={colors}
                    faded={semis !== 0 ? outsideRange : undefined}
                    selected={pb.playing ? undefined : selected}
                    onTap={onTap}
                    onChordTap={hasChords ? (bar, index) => setChordSel({ bar, index }) : undefined}
                    activeChord={chordSel}
                    cursor={pb.playing ? pb.cursor : undefined}
                    width={980}
                  />
                </article>

                <aside className="panel flex flex-col items-center p-5 text-center xl:sticky xl:top-4">
                  {note && fingering ? (
                    <>
                      <p className="caps-xs text-smoke-dim">Fingering</p>
                      <p className="mt-1 font-display text-4xl">
                        <NoteText text={noteName(note)} />
                      </p>
                      <div className="my-3 w-full max-w-[160px]">
                        <FingeringDiagram pressed={fingering.keys} />
                      </div>
                      <ul className="space-y-0.5 text-sm">
                        {describe(fingering.keys).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="py-8">
                      <p className="caps-xs text-smoke-dim">Fingering</p>
                      <p className="mt-3 text-sm text-smoke-dim">
                        {HOSTED ? 'Tap any note in the chart.' : 'Tap any note in the chart. Each first tap counts as a lookup.'}
                      </p>
                    </div>
                  )}
                </aside>
              </div>

              {chordPos >= 0 && (
                <ChordPanel
                  key={`${chordSel!.bar}-${chordSel!.index}`}
                  chord={chordList[chordPos].chord!}
                  next={chordList[chordPos + 1]?.chord ?? null}
                  onClose={() => setChordSel(undefined)}
                  onPlay={playChord}
                  playing={pb.playing}
                />
              )}

              <section>
                <h2 className="caps mb-3 text-smoke-dim">Every note in this tune · {uniqueNotes.length} fingerings</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {uniqueNotes.map((n) => (
                    <FingeringCard key={n.midi} note={n} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
