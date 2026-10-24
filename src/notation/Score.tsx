import { useEffect, useRef, useState } from 'react';
import { Accidental, BarlineType, Beam, Formatter, Renderer, Stave, StaveNote } from 'vexflow/bravura';
import { LETTERS, nameOf, type Note } from '../../shared/theory.ts';

// Written-pitch notation with tappable notes. Two uses:
// - scale lines: whole notes, no time signature, `barsPerLine` = 1 and each "bar" is a line;
// - exercises: real bars with a time signature.

export type ScoreItem = { note: Note; duration: 'w' | 'h' | 'q' | '8' };

type Props = {
  bars: ScoreItem[][];
  barsPerLine: number;
  timeSig?: string;
  /** Note name under each note. */
  labels?: boolean;
  /** Colour per note index (across all bars). */
  colors?: Record<number, string>;
  /** Faded notes (e.g. outside the student's range). */
  faded?: (note: Note) => boolean;
  selected?: number;
  onTap?: (index: number) => void;
  /** Width of a full line in score units; the SVG scales to its container. */
  width?: number;
};

const PAD = 8;
const CLEF_W = 44;
const TIME_W = 26;
const INK = '#1a1210';
const FADED = '#9a8b80';
const ACC_ASCII: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' };

const vexKey = (n: Note) => `${LETTERS[n.letter].toLowerCase()}/${n.octave}`;

let fontsReady: Promise<unknown> | null = null;

export function Score({ bars, barsPerLine, timeSig, labels, colors = {}, faded, selected, onTap, width = 900 }: Props) {
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

    const lineH = labels ? 168 : 150;
    const lines = Math.ceil(bars.length / barsPerLine);
    const height = lines * lineH + PAD;
    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    const svg = el.querySelector('svg')!;

    const scaleMode = !timeSig;
    const longest = Math.max(...bars.map((b) => b.length));
    const slot = (width - PAD * 2 - CLEF_W) / longest;
    const barW = (width - PAD * 2 - CLEF_W - (timeSig ? TIME_W : 0)) / barsPerLine;
    let index = 0;

    bars.forEach((bar, b) => {
      const col = b % barsPerLine;
      const line = Math.floor(b / barsPerLine);
      const first = col === 0;
      const y = PAD + line * lineH;
      const extra = first ? CLEF_W + (timeSig && b === 0 ? TIME_W : 0) : 0;
      let x = PAD + (first ? 0 : CLEF_W + (timeSig ? TIME_W : 0) + barW * col);
      let w = (scaleMode ? slot * bar.length + 12 : barW) + extra;
      if (!scaleMode && first && b !== 0 && timeSig) w += TIME_W;
      if (scaleMode) x = PAD;

      const stave = new Stave(x, y, w, { spaceAboveStaffLn: 5, spaceBelowStaffLn: 4 });
      if (first) stave.addClef('treble');
      if (timeSig && b === 0) stave.addTimeSignature(timeSig);
      const last = b === bars.length - 1;
      stave.setEndBarType(last ? BarlineType.END : scaleMode ? BarlineType.NONE : BarlineType.SINGLE);
      stave.setContext(ctx).draw();

      // Accidentals: scale lines show every one; bars follow the "lasts for the bar" rule.
      const inBar = new Map<string, number>();
      const items = bar.map(({ note, duration }) => {
        const i = index++;
        const sn = new StaveNote({ keys: [vexKey(note)], duration });
        const id = `${note.letter}${note.octave}`;
        const current = inBar.get(id) ?? 0;
        if (scaleMode ? note.acc !== 0 : note.acc !== current) sn.addModifier(new Accidental(ACC_ASCII[note.acc]), 0);
        inBar.set(id, note.acc);
        const color = colors[i] ?? (faded?.(note) ? FADED : INK);
        sn.setStyle({ fillStyle: color, strokeStyle: color });
        return { sn, note, i };
      });
      const notes = items.map((it) => it.sn);
      const beams = scaleMode ? [] : Beam.generateBeams(notes);
      Formatter.FormatAndDraw(ctx, stave, notes);
      beams.forEach((beam) => beam.setContext(ctx).draw());

      const top = stave.getYForLine(0) - 46;
      const labelY = stave.getYForLine(4) + 50;
      for (const { sn, note, i } of items) {
        const box = sn.getBoundingBox();
        const cx = sn.getAbsoluteX() + 6;
        if (labels) {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', String(cx));
          t.setAttribute('y', String(labelY));
          t.setAttribute('class', i === selected ? 'note-label is-selected' : 'note-label');
          t.textContent = nameOf(note);
          svg.appendChild(t);
        }
        if (onTap) {
          const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const hw = Math.max(box.getW() + 10, 26);
          hit.setAttribute('x', String(cx - hw / 2));
          hit.setAttribute('y', String(top));
          hit.setAttribute('width', String(hw));
          hit.setAttribute('height', String(labelY + 8 - top));
          hit.setAttribute('rx', '6');
          hit.setAttribute('class', i === selected ? 'note-hit is-selected' : 'note-hit');
          hit.addEventListener('click', () => onTap(i));
          svg.appendChild(hit);
        }
      }
    });

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = 'auto';
  }, [bars, barsPerLine, timeSig, labels, colors, faded, selected, onTap, width, ready]);

  return <div ref={host} className="score" />;
}
