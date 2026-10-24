import { useEffect, useRef, useState } from 'react';
import { Button, Clock, LipLoad } from '../ui/controls.tsx';

// Design prototype: a hard-coded week-1 session (2 playing blocks of ~15 min, one rest).
// Phase 1c replaces this with the real planner.

type Segment =
  | { kind: 'warmup' | 'reading' | 'technique' | 'tune' | 'cooldown'; title: string; task: string; min: number; load: 'low' | 'med' | 'high' }
  | { kind: 'rest'; min: number };

const SEGMENTS: Segment[] = [
  { kind: 'warmup', title: 'Warm-up', task: 'Quiet long tones on G, A, B. Jaw dropped, "ee" tongue.', min: 5, load: 'low' },
  { kind: 'reading', title: 'Reading', task: 'R1 · G, A, B · left hand only', min: 10, load: 'low' },
  { kind: 'rest', min: 8 },
  { kind: 'technique', title: 'Technique', task: 'Swing the G-A-B line: tongue 2, slur 2', min: 6, load: 'med' },
  { kind: 'tune', title: 'Tune', task: 'Autumn Leaves · bars 1-4 from the chart', min: 8, load: 'med' },
  { kind: 'cooldown', title: 'Cool-down', task: 'Soft long tones, low register', min: 3, load: 'low' },
];

const PLAYING_BLOCKS = SEGMENTS.filter((s) => s.kind !== 'rest').length;

type Props = { onSceneDim: (dim: number) => void };

export function SessionScreen({ onSceneDim }: Props) {
  const [index, setIndex] = useState(1);
  const [remaining, setRemaining] = useState(SEGMENTS[1].min * 60 - 83);
  const [running, setRunning] = useState(false);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const last = useRef(0);

  const seg = SEGMENTS[index];
  const resting = seg.kind === 'rest';

  useEffect(() => onSceneDim(resting ? 0 : 0.7), [resting, stoppedAt, onSceneDim]);

  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last.current) / 1000;
      last.current = now;
      setRemaining((r) => r - dt);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const next = () => {
    if (index >= SEGMENTS.length - 1) return setRunning(false);
    setIndex(index + 1);
    setRemaining(SEGMENTS[index + 1].min * 60);
  };

  useEffect(() => {
    if (remaining <= 0 && running) next();
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || stoppedAt !== null) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setRunning((r) => !r);
      } else if (e.key === 'n' && !resting) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const playedMinutes = Math.round(
    SEGMENTS.slice(0, index).reduce((sum, s) => sum + (s.kind === 'rest' ? 0 : s.min), 0) +
      (resting ? 0 : seg.min - remaining / 60),
  );

  if (stoppedAt !== null) return <OffHorn minutes={stoppedAt} />;

  const blockNumber = SEGMENTS.slice(0, index + 1).filter((s) => s.kind !== 'rest').length;

  return (
    <div className="flex flex-1 flex-col">
      {resting ? (
        <section className="mx-auto mt-auto flex w-full max-w-5xl flex-wrap items-end justify-between gap-x-10 gap-y-4 px-4 [text-shadow:0_2px_18px_rgb(0_0_0/0.95)]">
          <div>
            <p className="caps text-ember">Rest · lips off the reed</p>
            <Clock seconds={remaining} className="mt-1 block text-[5.5rem] text-smoke" />
            <p className="mt-2 text-lg text-smoke-dim">
              Next: <span className="text-smoke">{nextTitle(index)}</span>
            </p>
          </div>
          <div className="mb-2 flex gap-4">
            <Button variant="primary" shortcut="Space" onClick={() => setRunning(!running)}>
              {running ? 'Pause' : 'Start rest'}
            </Button>
            <Button variant="ghost" onClick={next}>
              Skip rest (gets logged)
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center text-center">
          <div className="flex items-center gap-4">
            <p className="caps text-smoke-dim">
              Block {blockNumber} of {PLAYING_BLOCKS}
            </p>
            <LipLoad load={seg.load} />
          </div>
          <h1 className="mt-4 font-display text-6xl">{seg.title}</h1>
          <p className="mt-3 text-2xl text-smoke-dim">{seg.task}</p>
          <Clock seconds={remaining} className={`mt-6 text-[11rem] ${running ? 'text-smoke' : 'text-smoke/75'}`} />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button variant="primary" shortcut="Space" onClick={() => setRunning(!running)}>
              {running ? 'Pause' : 'Start'}
            </Button>
            <Button shortcut="N" onClick={next}>
              Next block
            </Button>
            <Button variant="danger" onClick={() => setStoppedAt(playedMinutes)}>
              Lip failing / biting
            </Button>
          </div>
        </section>
      )}

      <Rail index={index} resting={resting} />
    </div>
  );
}

function nextTitle(index: number) {
  const n = SEGMENTS[index + 1];
  return n && n.kind !== 'rest' ? `${n.title} · ${n.task} · ${n.min} min · ${n.load} load` : 'Finish';
}

function Rail({ index, resting }: { index: number; resting: boolean }) {
  return (
    <ol className={`mx-auto mb-4 flex flex-wrap justify-center gap-2 ${resting ? 'pt-5' : 'mt-auto pt-10'}`}>
      {SEGMENTS.map((s, i) => {
        const state = i < index ? 'done' : i === index ? 'now' : 'next';
        const style =
          state === 'now'
            ? 'border-ember text-smoke bg-ink/70'
            : state === 'done'
              ? 'border-transparent text-smoke-dim/70 bg-ink/50 line-through'
              : 'border-smoke/25 text-smoke-dim bg-ink/50';
        return (
          <li key={i} className={`rounded-full border-2 px-4 py-2 text-base ${style}`}>
            {s.kind === 'rest' ? `Rest ${s.min}` : `${s.title} ${s.min}`}
            <span className="opacity-60"> min</span>
          </li>
        );
      })}
    </ol>
  );
}

function OffHorn({ minutes }: { minutes: number }) {
  return (
    <section className="panel mx-auto mt-10 max-w-3xl p-10">
      <p className="caps text-ember">Playing stopped · logged at {minutes} min</p>
      <h1 className="mt-3 font-display text-5xl">Off the horn</h1>
      <p className="mt-4 text-smoke-dim">
        The lip is done for today. Keep learning without it:
      </p>
      <ul className="mt-6 space-y-4 text-xl">
        <li>
          <span className="font-semibold">Silent fingering</span> · today's reading exercise, keys only, no air
        </li>
        <li>
          <span className="font-semibold">Theory at the piano</span> · T1, half steps and whole steps
        </li>
        <li>
          <span className="font-semibold">Ear</span> · sing a 3-note pattern, find it on the piano
        </li>
      </ul>
      <div className="mt-8">
        <Button variant="primary">Finish and log the session</Button>
      </div>
    </section>
  );
}
