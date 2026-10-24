import { useEffect, useRef, useState } from 'react';
import { BarlineType, Beam, Formatter, Renderer, Stave, StaveNote } from 'vexflow/bravura';

// Renders written-pitch notation large enough to read at arm's length, with tappable notes.

export type ScoreNote = { pitch: string; duration: 'w' | 'h' | 'q' | '8' };
export type NoteMark = 'lookup' | 'fumbled' | undefined;

type Props = {
  bars: ScoreNote[][];
  marks: NoteMark[]; // indexed by note position across all bars
  selected?: number;
  onTap: (index: number) => void;
};

const BARS_PER_LINE = 2;
const STAVE_W = 220;
const FIRST_EXTRA = 70; // clef + time signature
const LINE_H = 112;
const PAD = 10;

const INK = '#1a1210';
const COLORS = { lookup: '#9a5410', fumbled: '#8f1d22' };

// 'F#4' -> 'f#/4'
const toVexKey = (pitch: string) => pitch.replace(/^([A-G][#b]?)(\d)$/, (_, n: string, o: string) => `${n.toLowerCase()}/${o}`);

let fontsReady: Promise<unknown> | null = null;

export function Staff({ bars, marks, selected, onTap }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fontsReady ??= document.fonts.load('30px Bravura');
    fontsReady.then(() => setReady(true));
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;
    el.innerHTML = '';

    const lines = Math.ceil(bars.length / BARS_PER_LINE);
    const width = PAD * 2 + FIRST_EXTRA + STAVE_W * BARS_PER_LINE;
    const height = lines * LINE_H + PAD * 2;
    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    ctx.setFillStyle(INK);
    ctx.setStrokeStyle(INK);

    const svg = el.querySelector('svg')!;
    let index = 0;

    bars.forEach((bar, b) => {
      const col = b % BARS_PER_LINE;
      const first = col === 0;
      const x = PAD + (first ? 0 : FIRST_EXTRA + STAVE_W * col);
      const y = PAD + Math.floor(b / BARS_PER_LINE) * LINE_H;
      const stave = new Stave(x, y, first ? STAVE_W + FIRST_EXTRA : STAVE_W);
      if (first) stave.addClef('treble');
      if (b === 0) stave.addTimeSignature('4/4');
      if (b === bars.length - 1) stave.setEndBarType(BarlineType.END);
      stave.setContext(ctx).draw();

      const notes = bar.map((n) => {
        const i = index++;
        const note = new StaveNote({ keys: [toVexKey(n.pitch)], duration: n.duration });
        const mark = marks[i];
        const color = mark ? COLORS[mark] : INK;
        note.setStyle({ fillStyle: color, strokeStyle: color });
        return { note, i };
      });
      const staveNotes = notes.map((n) => n.note);
      const beams = Beam.generateBeams(staveNotes);
      Formatter.FormatAndDraw(ctx, stave, staveNotes);
      beams.forEach((beam) => beam.setContext(ctx).draw());

      // Generous transparent hit area per note.
      for (const { note, i } of notes) {
        const box = note.getBoundingBox();
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        hit.setAttribute('x', String(box.getX() - 6));
        hit.setAttribute('y', String(y + 20));
        hit.setAttribute('width', String(box.getW() + 12));
        hit.setAttribute('height', String(LINE_H - 30));
        hit.setAttribute('rx', '6');
        hit.setAttribute('class', i === selected ? 'note-hit is-selected' : 'note-hit');
        hit.addEventListener('click', () => onTap(i));
        svg.appendChild(hit);
      }
    });

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = 'auto';
  }, [bars, marks, selected, onTap, ready]);

  return <div ref={host} className="staff" />;
}
