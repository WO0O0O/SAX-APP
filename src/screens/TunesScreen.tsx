import { useCallback, useEffect, useMemo, useState } from 'react';
import { noteName } from '../../shared/theory.ts';
import { getTunes, loadChart, logLookup, MILESTONES, openPdf, slugOf, type Tune } from '../api.ts';
import { FingeringCard } from '../fingering/FingeringCard.tsx';
import { FingeringDiagram } from '../fingering/FingeringDiagram.tsx';
import { FINGERINGS, describe } from '../fingering/fingerings.ts';
import { parseChart, type Chart, type ChartFile } from '../music/chart.ts';
import { Score } from '../notation/Score.tsx';
import { TuneProgress } from '../tunes/TuneProgress.tsx';
import { NoteText } from '../ui/NoteText.tsx';
import { UnlockPanel } from '../ui/UnlockPanel.tsx';
import { useNarrow } from '../ui/useNarrow.ts';
import { HOSTED } from '../mode.ts';
import { LockedError } from '../sealed.ts';
import '../notation/score.css';

const LOOKUP = '#9a5410';
const STORE = 'sax.tune.v1';

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

  useEffect(() => onSceneDim(0.5), [onSceneDim]);
  useEffect(() => {
    getTunes().then(setTunes).catch(() => setTunes([]));
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
    loadChart<ChartFile>(slugOf(tune.title))
      .then((file) => setChart(parseChart(file)))
      .catch((e) => setChart(e instanceof LockedError ? 'locked' : 'missing'));
  }, [tune?.id, reload]);

  const loaded = chart && typeof chart === 'object' ? chart : null;
  const items = useMemo(() => (loaded ? loaded.bars.flat() : []), [loaded]);
  const uniqueNotes = useMemo(() => {
    const byMidi = new Map(items.filter((it) => it.note).map((it) => [it.note!.midi, it.note!]));
    return [...byMidi.values()].sort((a, b) => a.midi - b.midi);
  }, [items]);

  const onTap = useCallback(
    (i: number) => {
      const note = items[i]?.note;
      if (!note) return;
      setSelected(i);
      if (!looked[i]) {
        setLooked((l) => ({ ...l, [i]: LOOKUP }));
        logLookup(note.midi);
      }
    },
    [items, looked],
  );

  const note = selected !== undefined ? items[selected]?.note : undefined;
  const fingering = note ? FINGERINGS[note.midi]?.[0] : undefined;

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
            {loaded && (
              <p className="mt-1 text-smoke-dim">
                Written for alto in <span className="text-smoke">{loaded.writtenKey}</span> (concert {loaded.concertKey}) · {loaded.arranger}
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
                    <p className="caps text-lookup">Chart · tap a note for its fingering</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="size-4 accent-lookup" />
                      Note names
                    </label>
                  </header>
                  <Score
                    bars={loaded.bars}
                    chords={loaded.chords}
                    barsPerLine={narrow ? 2 : 4}
                    timeSig={loaded.timeSig ?? "4/4"}
                    keySig={loaded.keySig}
                    labels={labels}
                    colors={looked}
                    selected={selected}
                    onTap={onTap}
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
                        {HOSTED ? 'Tap any note in the chart.' : 'Tap any note in the chart. Each first tap counts as a lookup.'}</p>
                    </div>
                  )}
                </aside>
              </div>

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
