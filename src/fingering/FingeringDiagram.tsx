import type { KeyId } from './fingerings.ts';

// Schematic alto key layout (not to scale), modelled on the reference chart:
// main pearls in the middle, palm keys and octave key top left, left-pinky table to the right
// of the left hand, side keys to the right of the right hand, right-pinky keys bottom left.
type KeyShape = { id: KeyId; x: number; y: number; w: number; h: number; label: string; back?: boolean };

const R = 19;
const KEYS: KeyShape[] = [
  { id: 'oct', x: 36, y: 64, w: 30, h: 14, label: 'Oct', back: true },
  { id: 'palmD', x: 52, y: 106, w: 14, h: 26, label: 'D' },
  { id: 'palmEb', x: 40, y: 140, w: 14, h: 26, label: 'E♭' },
  { id: 'palmF', x: 52, y: 174, w: 14, h: 26, label: 'F' },
  { id: 'L1', x: 110, y: 100, w: R * 2, h: R * 2, label: '1' },
  { id: 'bis', x: 110, y: 129, w: 12, h: 12, label: 'Bis' },
  { id: 'L2', x: 110, y: 158, w: R * 2, h: R * 2, label: '2' },
  { id: 'L3', x: 110, y: 208, w: R * 2, h: R * 2, label: '3' },
  { id: 'gs', x: 168, y: 196, w: 30, h: 14, label: 'G♯' },
  { id: 'lowCs', x: 168, y: 218, w: 26, h: 14, label: 'C♯' },
  { id: 'lowB', x: 168, y: 240, w: 26, h: 14, label: 'B' },
  { id: 'lowBb', x: 168, y: 262, w: 26, h: 14, label: 'B♭' },
  { id: 'R1', x: 110, y: 296, w: R * 2, h: R * 2, label: '1' },
  { id: 'R2', x: 110, y: 346, w: R * 2, h: R * 2, label: '2' },
  { id: 'altFs', x: 74, y: 371, w: 10, h: 20, label: 'F♯' },
  { id: 'R3', x: 110, y: 396, w: R * 2, h: R * 2, label: '3' },
  { id: 'sideE', x: 170, y: 306, w: 12, h: 24, label: 'E' },
  { id: 'sideC', x: 170, y: 336, w: 12, h: 24, label: 'C' },
  { id: 'sideBb', x: 170, y: 366, w: 12, h: 24, label: 'B♭' },
  { id: 'highFs', x: 170, y: 398, w: 12, h: 24, label: 'F♯' },
  { id: 'eb', x: 62, y: 434, w: 34, h: 14, label: 'E♭' },
  { id: 'lowC', x: 62, y: 460, w: 34, h: 18, label: 'C' },
];

const isPearl = (k: KeyShape) => k.w === k.h && k.w > 20;

/** `compact` hides the labels of small keys that aren't pressed. */
export function FingeringDiagram({ pressed, compact = false }: { pressed: KeyId[]; compact?: boolean }) {
  return (
    <svg viewBox="0 30 220 460" className="block h-auto w-full" role="img" aria-label={`Keys pressed: ${pressed.join(', ') || 'none'}`}>
      <path d="M110,62 L110,420" stroke="#efe6da" strokeOpacity="0.1" strokeWidth="26" strokeLinecap="round" />
      <line x1="76" x2="144" y1="252" y2="252" stroke="#efe6da" strokeOpacity="0.3" strokeDasharray="3 5" />
      {KEYS.map((k) => {
        const on = pressed.includes(k.id);
        const pearl = isPearl(k);
        const showLabel = pearl || on || !compact;
        const labelLeft = k.id === 'altFs';
        return (
          <g key={k.id}>
            {on && <circle cx={k.x} cy={k.y} r={pearl ? 30 : 18} fill="#e0863a" opacity="0.18" />}
            <rect
              x={k.x - k.w / 2}
              y={k.y - k.h / 2}
              width={k.w}
              height={k.h}
              rx={Math.min(k.w, k.h) / 2}
              fill={on ? '#e0863a' : 'transparent'}
              stroke={on ? '#f6c592' : '#efe6da'}
              strokeOpacity={on ? 1 : 0.4}
              strokeWidth={pearl ? 2.5 : 1.8}
              strokeDasharray={k.back && !on ? '3 3' : undefined}
            />
            {showLabel && (
              <text
                x={pearl ? k.x : labelLeft ? k.x - k.w / 2 - 4 : k.x + k.w / 2 + 4}
                y={pearl ? k.y + 5 : k.y + 4.5}
                textAnchor={pearl ? 'middle' : labelLeft ? 'end' : 'start'}
                fontSize={pearl ? 15 : 13}
                fontWeight="600"
                fill={on && pearl ? '#0b0706' : on ? '#f6c592' : '#efe6da'}
                fillOpacity={on ? 1 : 0.55}
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
