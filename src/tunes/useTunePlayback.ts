import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseChord } from '../../shared/chords.ts';
import type { Note } from '../../shared/theory.ts';
import { bandEvents, chordSegments, type BandStyle } from '../audio/band.ts';
import { pieceFromBars, pieceFromNotes } from '../audio/events.ts';
import { usePlayer } from '../audio/usePlayer.ts';
import { useAudioSettings } from '../audio/settings.ts';
import { barRange, beatsPerBar, melodyEvents, SWING_RATIO, swungCursor, type Swing } from '../audio/tunePlan.ts';
import type { SchedEvent } from '../audio/transport.ts';
import type { Chart } from '../music/chart.ts';

export type Playback = ReturnType<typeof useTunePlayback>;

/** Everything about playing a chart: tempo, swing, loop, count-in, and the cursor. */
export function useTunePlayback(chart: Chart | null) {
  const { voice } = useAudioSettings();
  const player = usePlayer();
  const [bpm, setBpmState] = useState(100);
  const [swing, setSwing] = useState<Swing>('off');
  const [countIn, setCountIn] = useState(true);
  const [click, setClick] = useState(false);
  const [melody, setMelody] = useState(true);
  const [silent, setSilent] = useState(false);
  const [loop, setLoop] = useState(false);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [band, setBand] = useState<BandStyle | 'off'>('off');
  const [seed, setSeed] = useState(1);
  const [trainer, setTrainer] = useState(false);
  const [every, setEvery] = useState(2);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const trainerRef = useRef({ trainer, every });
  trainerRef.current = { trainer, every };

  const piece = useMemo(() => (chart ? pieceFromBars(chart.bars, beatsPerBar(chart.timeSig)) : null), [chart]);
  const bars = chart?.bars.length ?? 0;

  // A new tune brings its own tempo and feel.
  useEffect(() => {
    if (!chart) return;
    player.stop();
    setBpmState(chart.tempo ?? 100);
    setSwing(chart.swing ? 'full' : 'off');
    setFrom(1);
    setTo(chart.bars.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart?.title]);

  const setBpm = useCallback(
    (v: number) => {
      const b = Math.max(40, Math.min(220, Math.round(v) || 100));
      setBpmState(b);
      player.setBpm(b);
    },
    [player],
  );

  const start = useCallback(
    (fromItem?: number) => {
      if (!chart || !piece) return;
      const bpb = beatsPerBar(chart.timeSig);
      let range: [number, number] = [0, piece.totalBeats];
      if (loop) range = barRange(piece, from, to);
      else if (fromItem !== undefined && piece.itemStarts[fromItem] !== undefined) range = [piece.itemStarts[fromItem], piece.totalBeats];
      const events: SchedEvent[] = [];
      if (melody) events.push(...melodyEvents(piece.events, swing));
      if (click) for (let b = Math.ceil(range[0]); b < range[1]; b++) events.push({ start: b, dur: 1, kind: 'click', accent: b % bpb === 0 });
      if (band !== 'off' && chart.chords.some((c) => c.length)) {
        const segments = chordSegments(chart.chords, parseChord, piece.barStarts, piece.totalBeats);
        const feel = band === 'swing' || band === 'ballad' ? SWING_RATIO[swing === 'off' && band === 'swing' ? 'full' : swing] : 0.5;
        events.push(...bandEvents({ segments, range, beatsPerBar: bpb, style: band, swing: feel, seed }));
      }
      player.play({
        events,
        bpm,
        range,
        loop,
        countIn: countIn ? bpb : 0,
        beatsPerBar: bpb,
        voice,
        cursorEvents: melody ? swungCursor(piece.events, swing) : [],
        levels: silent ? { melody: 0, band: 0 } : { melody: 1, band: 0.75 },
        // Speed trainer: every few loops, a little faster.
        onLoop: (n) => {
          const t = trainerRef.current;
          if (t.trainer && n % t.every === 0) setBpm(bpmRef.current + 4);
        },
      });
    },
    [chart, piece, loop, from, to, melody, swing, click, bpm, countIn, voice, player, band, seed, setBpm, silent],
  );

  /** Plays a handful of notes (a scale, an arpeggio or a chord), not the chart. */
  const playNotes = useCallback(
    (notes: Note[], how: 'line' | 'chord' | 'up') => {
      if (how === 'chord') {
        player.play({
          events: notes.map((n) => ({ start: 0, dur: 3, kind: 'melody' as const, midi: n.midi, gain: 0.32 })),
          bpm,
          range: [0, 3],
          loop: false,
          countIn: 0,
          beatsPerBar: 4,
          voice,
        });
        return;
      }
      const p = pieceFromNotes(notes, how === 'line');
      player.play({
        events: p.events.map((e) => ({ start: e.start, dur: e.dur * 0.95, kind: 'melody' as const, midi: e.midi, item: e.item })),
        bpm,
        range: [0, p.totalBeats],
        loop: false,
        countIn: 0,
        beatsPerBar: 4,
        voice,
        cursorEvents: p.events,
      });
    },
    [bpm, voice, player],
  );

  return {
    playing: player.playing,
    cursor: player.cursor,
    start,
    stop: player.stop,
    playNotes,
    bars,
    bpm, setBpm,
    swing, setSwing,
    countIn, setCountIn,
    click, setClick,
    melody, setMelody,
    silent, setSilent,
    loop, setLoop,
    from, setFrom,
    to, setTo,
    band, setBand,
    reroll: () => setSeed((x) => x + 1),
    trainer, setTrainer,
    every, setEvery,
    hasChords: Boolean(chart?.chords.some((c) => c.length)),
  };
}
