import type { KeyboardEvent } from 'react';
import { nameOf, parseSpelling } from '../../shared/theory.ts';
import { CIRCLE } from './scales.ts';
import { scaleSpellings } from './build.ts';

const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];

/** '2♯', '3♭', 'no ♯/♭' for the major key on this tonic. */
export function keySignature(tonic: string): string {
  const total = scaleSpellings(tonic, MAJOR).reduce((sum, s) => sum + s.acc, 0);
  return total === 0 ? 'no ♯ or ♭' : total > 0 ? `${total}♯` : `${-total}♭`;
}

const display = (name: string) => nameOf(parseSpelling(name));

type Props = { pos: number; tonic: string; onChange: (pos: number) => void };

export function CircleDial({ pos, tonic, onChange }: Props) {
  const cx = 150;
  const cy = 150;
  const R = 112;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onChange((pos + 1) % 12);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onChange((pos + 11) % 12);
    else return;
    e.preventDefault();
  };

  return (
    <svg viewBox="0 0 300 300" className="block h-auto w-full" role="radiogroup" aria-label="Circle of fifths" onKeyDown={onKey}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#efe6da" strokeOpacity="0.15" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={70} fill="#140c09" stroke="#4a2c1c" strokeWidth="1.5" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-smoke font-display" fontSize="40">
        {[...display(tonic)].map((ch, i) =>
          /[♯♭]/u.test(ch) ? (
            <tspan key={i} className="font-sans" fontSize="26" fontWeight="600">
              {ch}
            </tspan>
          ) : (
            ch
          ),
        )}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" className="fill-smoke-dim" fontSize="12.5">
        major key: {keySignature(tonic)}
      </text>
      {CIRCLE.map((names, i) => {
        const a = ((-90 + i * 30) * Math.PI) / 180;
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a);
        const on = i === pos;
        const label = names.map((n) => display(n!)).join('/');
        return (
          <g
            key={i}
            role="radio"
            aria-checked={on}
            aria-label={`${label}`}
            tabIndex={on ? 0 : -1}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-brass"
            onClick={() => onChange(i)}
          >
            <circle cx={x} cy={y} r={24} fill={on ? '#e0863a' : '#2a1810'} stroke={on ? '#f6c592' : '#4a2c1c'} strokeWidth="2" />
            <text
              x={x}
              y={y + (names.length > 1 ? 4 : 6)}
              textAnchor="middle"
              fontSize={names.length > 1 ? 11.5 : 17}
              fontWeight="700"
              fill={on ? '#0b0706' : '#efe6da'}
            >
              {label}
            </text>
          </g>
        );
      })}
      <text x="4" y="14" fontSize="10" letterSpacing="1.5" className="fill-smoke-dim">♭ FLATS</text>
      <text x="296" y="14" fontSize="10" letterSpacing="1.5" textAnchor="end" className="fill-smoke-dim">SHARPS ♯</text>
    </svg>
  );
}
