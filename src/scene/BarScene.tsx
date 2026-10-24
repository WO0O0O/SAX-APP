import './scene.css';

// Abstract jazz-club backdrop: lamp light out of focus, ribbons of warm light and smoke
// flowing across the room. No figures. Animation is CSS on transform/opacity only.

type Props = {
  /** 0 = full scene, 1 = fully blacked out. */
  dim?: number;
};

// [cx, cy, r, colour, opacity, pulse duration s (0 = still)]
const BOKEH: [number, number, number, string, number, number][] = [
  [180, 260, 90, '#e0863a', 0.22, 7],
  [330, 140, 40, '#efe6da', 0.1, 0],
  [470, 330, 60, '#8f1d22', 0.35, 9],
  [1250, 200, 110, '#e0863a', 0.16, 11],
  [1420, 380, 55, '#c9a25b', 0.18, 6],
  [1080, 120, 30, '#efe6da', 0.12, 0],
  [760, 90, 70, '#8f1d22', 0.25, 13],
  [1530, 110, 45, '#e0863a', 0.2, 8],
  [90, 520, 50, '#c9a25b', 0.12, 0],
  [1340, 640, 80, '#8f1d22', 0.22, 10],
  [620, 700, 36, '#e0863a', 0.14, 0],
  [980, 560, 26, '#efe6da', 0.1, 5],
];

// Each ribbon: centre line y, wave height, horizontal shift, gradient, drift animation.
const RIBBONS = [
  { y: 520, amp: 160, shift: 0, grad: 'ribbonRed', width: 150, anim: 'drift-a', dur: 34 },
  { y: 420, amp: 120, shift: 300, grad: 'ribbonAmber', width: 70, anim: 'drift-b', dur: 28 },
  { y: 640, amp: 140, shift: -200, grad: 'ribbonRed', width: 90, anim: 'drift-b', dur: 40 },
  { y: 300, amp: 100, shift: 150, grad: 'ribbonSmoke', width: 110, anim: 'drift-a', dur: 46 },
];

function wave(y: number, amp: number, shift: number) {
  const x = (n: number) => n + shift;
  return `M${x(-500)},${y} C${x(-100)},${y - amp} ${x(250)},${y + amp} ${x(650)},${y} S${x(1300)},${y - amp} ${x(1650)},${y} S${x(2150)},${y + amp} ${x(2300)},${y}`;
}

// [x, y, r, duration s, delay s, horizontal drift px]
const PUFFS: [number, number, number, number, number, number][] = [
  [300, 760, 140, 30, 0, 60],
  [820, 820, 180, 36, -12, -40],
  [1300, 780, 150, 32, -20, -70],
  [600, 600, 120, 26, -6, 30],
  [1100, 650, 130, 34, -26, 50],
];

export function BarScene({ dim = 0 }: Props) {
  return (
    <div className="scene" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="room" cx="50%" cy="40%" r="80%">
            <stop offset="0" stopColor="#2e1911" />
            <stop offset="0.5" stopColor="#170d09" />
            <stop offset="1" stopColor="#080504" />
          </radialGradient>
          {['#e0863a', '#efe6da', '#8f1d22', '#c9a25b'].map((c) => (
            <radialGradient key={c} id={`bokeh-${c.slice(1)}`}>
              <stop offset="0" stopColor={c} stopOpacity="1" />
              <stop offset="0.55" stopColor={c} stopOpacity="0.45" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id="ribbonRed" gradientUnits="userSpaceOnUse" x1="-300" x2="1900" y1="0" y2="0">
            <stop offset="0" stopColor="#6e0f14" stopOpacity="0" />
            <stop offset="0.3" stopColor="#6e0f14" stopOpacity="0.9" />
            <stop offset="0.55" stopColor="#b8452c" stopOpacity="0.9" />
            <stop offset="0.8" stopColor="#6e0f14" stopOpacity="0.8" />
            <stop offset="1" stopColor="#6e0f14" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ribbonAmber" gradientUnits="userSpaceOnUse" x1="-300" x2="1900" y1="0" y2="0">
            <stop offset="0" stopColor="#e0863a" stopOpacity="0" />
            <stop offset="0.4" stopColor="#e0863a" stopOpacity="0.8" />
            <stop offset="0.7" stopColor="#c9a25b" stopOpacity="0.7" />
            <stop offset="1" stopColor="#c9a25b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ribbonSmoke" gradientUnits="userSpaceOnUse" x1="-300" x2="1900" y1="0" y2="0">
            <stop offset="0" stopColor="#efe6da" stopOpacity="0" />
            <stop offset="0.5" stopColor="#efe6da" stopOpacity="0.5" />
            <stop offset="1" stopColor="#efe6da" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="puff">
            <stop offset="0" stopColor="#efe6da" stopOpacity="0.12" />
            <stop offset="1" stopColor="#efe6da" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
            <stop offset="0.45" stopColor="#050302" stopOpacity="0" />
            <stop offset="1" stopColor="#050302" stopOpacity="0.85" />
          </radialGradient>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.94  0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0.5 0" />
          </filter>
        </defs>

        <rect width="1600" height="900" fill="url(#room)" />

        {BOKEH.map(([cx, cy, r, c, o, dur], i) => (
          <g key={i} opacity={o}>
            <circle
              className={dur ? 'pulse' : undefined}
              cx={cx}
              cy={cy}
              r={r}
              fill={`url(#bokeh-${c.slice(1)})`}
              style={dur ? { animationDuration: `${dur}s` } : undefined}
            />
          </g>
        ))}

        {RIBBONS.map((r, i) => (
          <g key={i} className={r.anim} style={{ animationDuration: `${r.dur}s` }}>
            <path d={wave(r.y, r.amp, r.shift)} fill="none" stroke={`url(#${r.grad})`} strokeWidth={r.width} strokeLinecap="round" opacity="0.16" />
            <path d={wave(r.y, r.amp, r.shift)} fill="none" stroke={`url(#${r.grad})`} strokeWidth={r.width / 4} strokeLinecap="round" opacity="0.3" />
            <path d={wave(r.y - r.width / 6, r.amp * 0.96, r.shift + 20)} fill="none" stroke="#e8c88a" strokeWidth="1.4" opacity="0.35" />
          </g>
        ))}

        {PUFFS.map(([x, y, r, dur, delay, dx], i) => (
          <circle
            key={i}
            className="puff"
            cx={x}
            cy={y}
            r={r}
            fill="url(#puff)"
            style={{ transformOrigin: `${x}px ${y}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s`, ['--dx' as string]: `${dx}px` }}
          />
        ))}

        <rect width="1600" height="900" filter="url(#grain)" opacity="0.07" />
        <rect width="1600" height="900" fill="url(#vignette)" />
      </svg>
      <div className="scene-dim" style={{ opacity: dim }} />
    </div>
  );
}
