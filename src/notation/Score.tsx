import { useEffect, useRef, useState } from 'react';
import { Accidental, BarlineType, Beam, Dot, Formatter, Renderer, Stave, StaveNote, StaveTie, Tuplet } from 'vexflow/bravura';
import { LETTERS, nameOf, parseSpelling, spellDegree, type Note } from '../../shared/theory.ts';

// Written-pitch notation with tappable notes. Two uses:
// - scale lines: whole notes, no time signature, `barsPerLine` = 1 and each "bar" is a line;
// - real music: bars with a time signature, optional key signature, rests, dots, ties, triplets, chords.

export type ScoreItem = {
  note?: Note; // undefined = rest
  duration: 'w' | 'h' | 'q' | '8';
  dots?: number;
  tie?: boolean; // tied to the next item
  triplet?: boolean;
};
export type ChordSymbol = { beat: number; name: string };

type Props = {
  bars: ScoreItem[][];
  barsPerLine: number;
  timeSig?: string;
  /** VexFlow key spec ('G', 'F', 'Bb'...). Accidentals then follow the key. */
  keySig?: string;
  chords?: ChordSymbol[][];
  /** Note name under each note. */
  labels?: boolean;
  /** Colour per item index (across all bars, rests included). */
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
const BEATS = { w: 4, h: 2, q: 1, '8': 0.5 };
const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];
const SVG_NS = 'http://www.w3.org/2000/svg';

const vexKey = (n: Note) => `${LETTERS[n.letter].toLowerCase()}/${n.octave}`;
const beatsOf = (it: ScoreItem) => BEATS[it.duration] * (it.dots ? 1.5 : 1) * (it.triplet ? 2 / 3 : 1);

/** Accidental per letter in a major key signature, e.g. G -> { F: +1 }. */
function keyAccidentals(keySig?: string): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  if (!keySig) return out;
  const tonic = parseSpelling(keySig);
  for (const d of MAJOR) {
    const s = spellDegree(tonic, d);
    out[s.letter] = s.acc;
  }
  return out;
}

let fontsReady: Promise<unknown> | null = null;

export function Score(props: Props) {
  const { bars, barsPerLine, timeSig, keySig, chords, labels, colors = {}, faded, selected, onTap, width = 900 } = props;
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

    const lineH = (labels ? 168 : 150) + (chords ? 14 : 0);
    const lines = Math.ceil(bars.length / barsPerLine);
    const height = lines * lineH + PAD;
    const renderer = new Renderer(el, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    const svg = el.querySelector('svg')!;

    const scaleMode = !timeSig;
    const keyAcc = keyAccidentals(keySig);
    const keySigW = keySig ? 10 + 10 * keyAcc.reduce((n, a) => n + Math.abs(a), 0) : 0;
    const headW = CLEF_W + keySigW;
    const longest = Math.max(...bars.map((b) => b.length));
    const slot = (width - PAD * 2 - headW) / longest;
    const barW = (width - PAD * 2 - headW - (timeSig ? TIME_W : 0)) / barsPerLine;

    const drawn: { sn: StaveNote; it: ScoreItem; line: number; i: number }[] = [];
    const hits: SVGElement[] = [];
    let index = 0;

    const addText = (x: number, y: number, text: string, cls: string) => {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(x));
      t.setAttribute('y', String(y));
      t.setAttribute('class', cls);
      t.textContent = text;
      svg.appendChild(t);
    };

    bars.forEach((bar, b) => {
      const col = b % barsPerLine;
      const line = Math.floor(b / barsPerLine);
      const first = col === 0;
      const y = PAD + line * lineH + (chords ? 14 : 0);
      const lead = b === 0 && timeSig ? TIME_W : 0;
      let x: number;
      let w: number;
      if (scaleMode) {
        x = PAD;
        w = headW + slot * bar.length + 12;
      } else {
        x = PAD + (first ? 0 : headW + (timeSig ? TIME_W : 0) + barW * col);
        w = barW + (first ? headW + (timeSig ? TIME_W : 0) : 0);
      }

      const stave = new Stave(x, y, w, { spaceAboveStaffLn: 5, spaceBelowStaffLn: 4 });
      if (first) {
        stave.addClef('treble');
        if (keySig) stave.addKeySignature(keySig);
      }
      if (lead) stave.addTimeSignature(timeSig!);
      const last = b === bars.length - 1;
      stave.setEndBarType(last ? BarlineType.END : scaleMode ? BarlineType.NONE : BarlineType.SINGLE);
      stave.setContext(ctx).draw();

      // Accidentals: scale lines show every one; music follows the key signature and the bar rule.
      const inBar = new Map<string, number>();
      const items = bar.map((it) => {
        const i = index++;
        let sn: StaveNote;
        if (!it.note) {
          sn = new StaveNote({ keys: [it.duration === 'w' ? 'd/5' : 'b/4'], duration: `${it.duration}r`, dots: it.dots });
        } else {
          const n = it.note;
          sn = new StaveNote({ keys: [vexKey(n)], duration: it.duration, dots: it.dots });
          const id = `${n.letter}${n.octave}`;
          const current = inBar.get(id) ?? keyAcc[n.letter];
          const tiedIn = drawn.at(-1)?.it.tie && drawn.at(-1)?.it.note?.midi === n.midi && !scaleMode;
          const show = scaleMode ? n.acc !== 0 : n.acc !== current && !tiedIn;
          if (show) sn.addModifier(new Accidental(ACC_ASCII[n.acc]), 0);
          inBar.set(id, n.acc);
          const color = colors[i] ?? (faded?.(n) ? FADED : INK);
          sn.setStyle({ fillStyle: color, strokeStyle: color });
        }
        if (it.dots) Dot.buildAndAttach([sn], { all: true });
        const entry = { sn, it, line, i };
        drawn.push(entry);
        return entry;
      });

      const notes = items.map((e) => e.sn);
      const tuplets: Tuplet[] = [];
      for (let k = 0; k < items.length; k++) {
        if (items[k].it.triplet && items[k + 1]?.it.triplet && items[k + 2]?.it.triplet) {
          tuplets.push(new Tuplet(notes.slice(k, k + 3), { numNotes: 3, notesOccupied: 2 }));
          k += 2;
        }
      }
      const beams = scaleMode ? [] : Beam.generateBeams(notes);
      Formatter.FormatAndDraw(ctx, stave, notes);
      beams.forEach((beam) => beam.setContext(ctx).draw());
      tuplets.forEach((t) => t.setContext(ctx).draw());

      // Chord symbols above the beat they start on.
      if (chords?.[b]) {
        for (const chord of chords[b]) {
          let beat = 0;
          const target = items.find((e) => {
            const hit = beat >= chord.beat - 0.01;
            beat += beatsOf(e.it);
            return hit;
          });
          const cx = target ? target.sn.getAbsoluteX() : stave.getNoteStartX();
          addText(cx - 4, y + 4, chord.name, 'chord');
        }
      }

      const top = stave.getYForLine(0) - 46;
      const labelY = stave.getYForLine(4) + 50;
      for (const { sn, it, i } of items) {
        if (!it.note) continue;
        const box = sn.getBoundingBox();
        const cx = sn.getAbsoluteX() + 6;
        const prev = drawn[drawn.findIndex((d) => d.i === i) - 1];
        const continuation = prev?.it.tie && prev.it.note?.midi === it.note.midi;
        if (labels && !continuation) addText(cx, labelY, nameOf(it.note), i === selected ? 'note-label is-selected' : 'note-label');
        if (onTap) {
          const hit = document.createElementNS(SVG_NS, 'rect');
          const hw = Math.max(box.getW() + 10, 24);
          hit.setAttribute('x', String(cx - hw / 2));
          hit.setAttribute('y', String(top));
          hit.setAttribute('width', String(hw));
          hit.setAttribute('height', String(labelY + 8 - top));
          hit.setAttribute('rx', '6');
          hit.setAttribute('class', i === selected ? 'note-hit is-selected' : 'note-hit');
          hit.addEventListener('click', () => onTap(i));
          hits.push(hit);
        }
      }
    });

    // Ties, including across bar lines and line breaks.
    drawn.forEach((d, k) => {
      const next = drawn[k + 1];
      if (!d.it.tie || !d.it.note || !next?.it.note) return;
      const ties =
        next.line === d.line
          ? [new StaveTie({ firstNote: d.sn, lastNote: next.sn, firstIndexes: [0], lastIndexes: [0] })]
          : [new StaveTie({ firstNote: d.sn, firstIndexes: [0] }), new StaveTie({ lastNote: next.sn, lastIndexes: [0] })];
      ties.forEach((t) => t.setContext(ctx).draw());
    });

    // Tap targets go on top of everything.
    hits.forEach((h) => svg.appendChild(h));

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = 'auto';
  }, [bars, barsPerLine, timeSig, keySig, chords, labels, colors, faded, selected, onTap, width, ready]);

  return <div ref={host} className="score" />;
}
