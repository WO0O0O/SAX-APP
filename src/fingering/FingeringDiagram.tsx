import type { KeyId } from './fingerings.ts';

// Schematic alto key layout (not to scale). Every small key is labelled.
type KeyShape = { id: KeyId; x: number; y: number; w: number; h: number; label?: string; back?: boolean };

const R = 19; // main pearl radius
const KEYS: KeyShape[] = [
  { id: 'oct', x: 36, y: 64, w: 30, h: 14, label: 'Oct', back: true },
  { id: 'palmD', x: 52, y: 106, w: 14, h: 26, label: 'D' },
  { id: 'palmEb', x: 40, y: 140, w: 14, h: 26, label: 'Eb' },
  { id: 'palmF', x: 52, y: 174, w: 14, h: 26, label: 'F' },
  { id: 'L1', x: 110, y: 100, w: R * 2, h: R * 2, label: '1' },
  { id: 'bis', x: 110, y: 129, w: 12, h: 12, label: 'Bis' },
  { id: 'L2', x: 110, y: 158, w: R * 2, h: R * 2, label: '2' },
  { id: 'L3', x: 110, y: 208, w: R * 2, h: R * 2, label: '3' },
  { id: 'gs', x: 168, y: 200, w: 30, h: 14, label: 'G#' },
  { id: 'lowCs', x: 168, y: 222, w: 26, h: 14, label: 'C#' },
  { id: 'lowB', x: 168, y: 244, w: 26, h: 14, label: 'B' },
  { id: 'lowBb', x: 168, y: 266, w: 26, h: 14, label: 'Bb' },
  { id: 'R1', x: 110, y: 290, w: R * 2, h: R * 2, label: '1' },
  { id: 'R2', x: 110, y: 340, w: R * 2, h: R * 2, label: '2' },
  { id: 'R3', x: 110, y: 390, w: R * 2, h: R * 2, label: '3' },
  { id: 'sideE', x: 170, y: 314, w: 12, h: 24, label: 'E' },
  { id: 'sideC', x: 170, y: 344, w: 12, h: 24, label: 'C' },
  { id: 'sideBb', x: 170, y: 374, w: 12, h: 24, label: 'Bb' },
  { id: 'eb', x: 62, y: 430, w: 34, h: 14, label: 'Eb' },
  { id: 'lowC', x: 62, y: 456, w: 34, h: 18, label: 'C' },
];

const isPearl = (k: KeyShape) => k.w === k.h && k.w > 20;

export function FingeringDiagram({ pressed }: { pressed: KeyId[] }) {
  return (
    <svg viewBox="0 0 220 490" className="h-auto w-full" role="img" aria-label={`Pressed: ${pressed.join(', ') || 'none'}`}>
      <defs>
        <radialGradient id="keyGlow">
          <stop offset="0" stopColor="#e0863a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e0863a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M110,58 L110,420" stroke="#efe6da" strokeOpacity="0.12" strokeWidth="26" strokeLinecap="round" />
      <line x1="76" x2="144" y1="250" y2="250" stroke="#efe6da" strokeOpacity="0.3" strokeDasharray="3 5" />
      <text x="8" y="246" className="fill-smoke-dim" fontSize="10" fontWeight="600" letterSpacing="1.5">LH</text>
      <text x="8" y="266" className="fill-smoke-dim" fontSize="10" fontWeight="600" letterSpacing="1.5">RH</text>

      {KEYS.map((k) => {
        const on = pressed.includes(k.id);
        const pearl = isPearl(k);
        return (
          <g key={k.id}>
            {on && <circle cx={k.x} cy={k.y} r={pearl ? 34 : 22} fill="url(#keyGlow)" />}
            <rect
              x={k.x - k.w / 2}
              y={k.y - k.h / 2}
              width={k.w}
              height={k.h}
              rx={Math.min(k.w, k.h) / 2}
              fill={on ? '#e0863a' : 'transparent'}
              stroke={on ? '#f6c592' : '#efe6da'}
              strokeOpacity={on ? 1 : 0.45}
              strokeWidth={pearl ? 2.5 : 1.8}
              strokeDasharray={k.back && !on ? '3 3' : undefined}
            />
            {k.label && (
              <text
                x={pearl ? k.x : k.x + k.w / 2 + 4}
                y={pearl ? k.y + 5 : k.y + 4}
                textAnchor={pearl ? 'middle' : 'start'}
                fontSize={pearl ? 14 : 12}
                fontWeight="600"
                fill={on && pearl ? '#0b0706' : '#efe6da'}
                fillOpacity={on ? 1 : 0.6}
              >
                {k.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
