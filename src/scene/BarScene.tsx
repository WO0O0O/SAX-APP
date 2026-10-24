import './scene.css';

// The jazz club behind every screen (docs/design.md, "The scene").
// One inline SVG; animation is CSS on transform/opacity only.

type Props = {
  /** 0 = full scene (rest/idle), 1 = fully blacked out. Work screens use ~0.5-0.8. */
  dim?: number;
};

export function BarScene({ dim = 0 }: Props) {
  return (
    <div className="scene" data-calm={dim > 0.3 || undefined} aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <Defs />
        <Room />
        <Stage />
        <Band />
        <Smoke />
        <Tables />
        <Foreground />
        <rect width="1600" height="900" fill="url(#vignette)" />
      </svg>
      <div className="scene-dim" style={{ opacity: dim }} />
    </div>
  );
}

function Defs() {
  return (
    <defs>
      <radialGradient id="wall" cx="56%" cy="35%" r="75%">
        <stop offset="0" stopColor="#3a2116" />
        <stop offset="0.45" stopColor="#1a0f0b" />
        <stop offset="1" stopColor="#080504" />
      </radialGradient>
      <radialGradient id="glow">
        <stop offset="0" stopColor="#e0863a" stopOpacity="0.4" />
        <stop offset="0.4" stopColor="#e0863a" stopOpacity="0.12" />
        <stop offset="1" stopColor="#e0863a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="pleats" gradientUnits="userSpaceOnUse" x1="0" x2="64" spreadMethod="repeat">
        <stop offset="0" stopColor="#3a060a" />
        <stop offset="0.5" stopColor="#7a1218" />
        <stop offset="1" stopColor="#3a060a" />
      </linearGradient>
      <linearGradient id="curtainShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.6" />
        <stop offset="0.5" stopColor="#000" stopOpacity="0.1" />
        <stop offset="1" stopColor="#000" stopOpacity="0.65" />
      </linearGradient>
      <linearGradient id="spot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#efe6da" stopOpacity="0.2" />
        <stop offset="1" stopColor="#efe6da" stopOpacity="0.04" />
      </linearGradient>
      <radialGradient id="pool">
        <stop offset="0" stopColor="#efe6da" stopOpacity="0.28" />
        <stop offset="1" stopColor="#efe6da" stopOpacity="0" />
      </radialGradient>
      {/* Silhouettes rim-lit from the spotlight side. */}
      <linearGradient id="rimRight" x1="0" x2="1">
        <stop offset="0" stopColor="#0b0706" />
        <stop offset="0.72" stopColor="#0d0807" />
        <stop offset="1" stopColor="#6a4029" />
      </linearGradient>
      <linearGradient id="rimLeft" x1="1" x2="0">
        <stop offset="0" stopColor="#0b0706" />
        <stop offset="0.72" stopColor="#0d0807" />
        <stop offset="1" stopColor="#6a4029" />
      </linearGradient>
      <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ecd08f" />
        <stop offset="0.45" stopColor="#b98d3f" />
        <stop offset="1" stopColor="#4f3816" />
      </linearGradient>
      <linearGradient id="bassWood" x1="1" x2="0">
        <stop offset="0" stopColor="#1a0b06" />
        <stop offset="0.75" stopColor="#2a130a" />
        <stop offset="1" stopColor="#7a4426" />
      </linearGradient>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c0402e" />
        <stop offset="1" stopColor="#6e0f14" />
      </linearGradient>
      <linearGradient id="patron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a2c1c" />
        <stop offset="0.16" stopColor="#170d0a" />
        <stop offset="1" stopColor="#0b0706" />
      </linearGradient>
      <linearGradient id="woodTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a4a2c" />
        <stop offset="1" stopColor="#2a1810" />
      </linearGradient>
      <radialGradient id="puff">
        <stop offset="0" stopColor="#efe6da" stopOpacity="0.16" />
        <stop offset="1" stopColor="#efe6da" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="0.5" stopColor="#050302" stopOpacity="0" />
        <stop offset="1" stopColor="#050302" stopOpacity="0.9" />
      </radialGradient>
    </defs>
  );
}

function Room() {
  return (
    <g>
      <rect width="1600" height="900" fill="url(#wall)" />
      {/* Wainscot */}
      <rect y="560" width="1600" height="340" fill="#120a07" />
      <rect y="556" width="1600" height="4" fill="#4a2c1c" opacity="0.5" />
      {/* Wall sconces */}
      {[170, 1430].map((x) => (
        <g key={x}>
          <circle className="flicker" cx={x} cy={300} r={170} fill="url(#glow)" />
          <path d={`M${x - 14},300 L${x - 8},282 L${x + 8},282 L${x + 14},300 Z`} fill="url(#shade)" />
          <rect x={x - 2} y={300} width={4} height={26} fill="#2a1810" />
        </g>
      ))}
    </g>
  );
}

// Scalloped valance across the top of the curtain.
const VALANCE = (() => {
  let d = 'M340,30 H1260 V92';
  const step = 920 / 10;
  for (let x = 1260; x > 340; x -= step) d += ` Q${x - step / 2},126 ${x - step},92`;
  return d + ' Z';
})();

function Stage() {
  return (
    <g>
      <path d="M360,522 C372,380 350,220 372,60 L1228,60 C1250,220 1228,380 1240,522 Z" fill="url(#pleats)" />
      <path d="M360,522 C372,380 350,220 372,60 L1228,60 C1250,220 1228,380 1240,522 Z" fill="url(#curtainShade)" />
      <path d={VALANCE} fill="url(#pleats)" />
      <path d={VALANCE} fill="#000" opacity="0.35" />
      {/* Riser */}
      <rect x="300" y="520" width="1000" height="42" fill="url(#woodTop)" />
      <rect x="300" y="520" width="1000" height="2" fill="#e0863a" opacity="0.35" />
      {/* Spotlight */}
      <path className="flicker-slow" d="M880,-20 L920,-20 L1130,530 L670,530 Z" fill="url(#spot)" />
      <ellipse cx="900" cy="526" rx="280" ry="26" fill="url(#pool)" />
    </g>
  );
}

function Band() {
  return (
    <g>
      {/* Piano + pianist (stage left) */}
      <g className="nod" style={{ transformOrigin: '676px 470px' }}>
        <ellipse cx="664" cy="372" rx="13" ry="16" fill="url(#rimRight)" />
        <path d="M650,392 C690,384 702,420 694,470 L660,470 C654,445 646,420 650,392 Z" fill="url(#rimRight)" />
        <path d="M655,405 C641,418 633,424 622,428 L625,435 C640,432 652,426 664,415 Z" fill="url(#rimRight)" />
      </g>
      <path d="M664,470 C650,480 640,496 642,520 L651,520 C653,500 666,488 692,478 Z" fill="url(#rimRight)" />
      <rect x="660" y="470" width="34" height="7" rx="2" fill="#0b0706" />
      <path d="M452,418 L612,418 C646,418 656,440 640,452 L452,452 Z" fill="url(#rimRight)" />
      <path d="M454,418 L598,346 L607,354 L472,418 Z" fill="url(#rimRight)" />
      <rect x="462" y="452" width="8" height="68" fill="#0b0706" />
      <rect x="624" y="452" width="8" height="68" fill="#0b0706" />

      {/* Upright bass + bassist */}
      <g className="bob" style={{ transformOrigin: '790px 520px' }}>
        <path d="M786,286 C814,280 826,320 820,380 L818,520 L806,520 L800,425 L792,520 L780,520 L782,380 C776,330 775,296 786,286 Z" fill="url(#rimRight)" />
        <ellipse cx="800" cy="262" rx="13" ry="16" fill="url(#rimRight)" />
        <path d="M788,300 C770,304 762,300 758,292" stroke="#0d0807" strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M790,380 C776,392 768,400 760,404" stroke="#0d0807" strokeWidth="9" strokeLinecap="round" fill="none" />
      </g>
      <g transform="rotate(-9 756 520)">
        <rect x="753" y="228" width="6" height="130" fill="#120806" />
        <circle cx="756" cy="226" r="7" fill="#120806" />
        <path d="M756,342 C722,342 716,372 728,392 C714,404 704,430 712,462 C722,500 790,500 800,462 C808,430 798,404 784,392 C796,372 790,342 756,342 Z" fill="url(#bassWood)" />
        <rect x="755" y="500" width="2" height="22" fill="#0b0706" />
      </g>

      {/* Saxophonist, centre in the spotlight */}
      <g className="sway" style={{ transformOrigin: '905px 528px' }}>
        <path d="M876,528 C882,480 886,450 890,410 L930,410 C932,450 930,490 932,528 L918,528 L910,446 L896,528 Z" fill="url(#rimLeft)" />
        <path d="M888,414 C880,370 884,330 900,300 C915,294 932,300 936,312 C941,345 937,382 932,414 Z" fill="url(#rimLeft)" />
        <ellipse cx="913" cy="282" rx="14" ry="17" transform="rotate(-18 913 282)" fill="url(#rimLeft)" />
        <path d="M894,268 L932,260 L933,269 L896,277 Z M902,268 C902,254 926,250 928,262 Z" fill="#0b0706" />
        {/* Horn */}
        <path d="M921,294 C931,296 936,303 938,314" stroke="url(#brass)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M938,314 C944,362 936,420 926,460 C920,482 936,494 950,480 C958,470 962,456 964,444" stroke="url(#brass)" strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M955,448 C961,431 972,420 988,417 L992,432 C979,436 971,445 969,458 Z" fill="url(#brass)" />
        <path d="M900,320 C914,332 926,346 936,352" stroke="#0d0807" strokeWidth="10" strokeLinecap="round" fill="none" />
        <path d="M893,348 C900,382 914,402 931,406" stroke="#0d0807" strokeWidth="10" strokeLinecap="round" fill="none" />
      </g>

      {/* Drums + drummer (stage right) */}
      <g className="bob-fast" style={{ transformOrigin: '1060px 470px' }}>
        <ellipse cx="1060" cy="366" rx="13" ry="16" fill="url(#rimLeft)" />
        <path d="M1040,388 C1060,380 1082,386 1084,404 L1086,470 L1036,470 L1038,410 Z" fill="url(#rimLeft)" />
        <path d="M1042,400 C1020,410 1008,420 996,424" stroke="#0d0807" strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M1080,402 C1100,388 1116,380 1128,376" stroke="#0d0807" strokeWidth="9" strokeLinecap="round" fill="none" />
      </g>
      <circle cx="1040" cy="482" r="38" fill="url(#rimLeft)" />
      <ellipse cx="992" cy="436" rx="26" ry="8" fill="#0d0807" />
      <rect x="990" y="440" width="4" height="80" fill="#0b0706" />
      <ellipse cx="1134" cy="370" rx="44" ry="6" transform="rotate(-10 1134 370)" fill="#2a1d10" />
      <ellipse className="shimmer" cx="1126" cy="368" rx="22" ry="2.5" transform="rotate(-10 1134 370)" fill="#ecd08f" />
      <rect x="1132" y="372" width="3" height="148" fill="#0b0706" />
      <ellipse cx="956" cy="400" rx="30" ry="5" fill="#2a1d10" />
      <rect x="954" y="402" width="3" height="118" fill="#0b0706" />
    </g>
  );
}

// [x, y, radius, duration s, delay s, horizontal drift px]
const PUFFS: [number, number, number, number, number, number][] = [
  [860, 420, 120, 26, 0, 40],
  [980, 380, 150, 30, -9, -50],
  [760, 300, 130, 28, -17, 30],
  [1040, 260, 110, 24, -5, -20],
  [300, 600, 110, 22, -3, 60],
  [270, 560, 90, 20, -12, 40],
  [1200, 600, 120, 27, -14, -40],
  [600, 520, 140, 32, -21, 20],
];

function Smoke() {
  return (
    <g>
      {PUFFS.map(([x, y, r, dur, delay, dx], i) => (
        <circle
          key={i}
          className="puff"
          cx={x}
          cy={y}
          r={r}
          fill="url(#puff)"
          style={{
            transformOrigin: `${x}px ${y}px`,
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
            ['--dx' as string]: `${dx}px`,
          }}
        />
      ))}
    </g>
  );
}

function Table({ x, y, s = 1, glasses = [] }: { x: number; y: number; s?: number; glasses?: ('martini' | 'tumbler')[] }) {
  return (
    <g>
      <circle className="flicker" cx={x} cy={y - 48 * s} r={120 * s} fill="url(#glow)" />
      <rect x={x - 6 * s} y={y} width={12 * s} height={80 * s} fill="#0b0706" />
      <ellipse cx={x} cy={y} rx={100 * s} ry={17 * s} fill="url(#woodTop)" />
      <ellipse cx={x} cy={y - 2 * s} rx={60 * s} ry={8 * s} fill="#e0863a" opacity="0.22" />
      <rect x={x - 3 * s} y={y - 42 * s} width={6 * s} height={40 * s} fill="#2a1810" />
      <path d={`M${x - 20 * s},${y - 40 * s} L${x - 12 * s},${y - 64 * s} L${x + 12 * s},${y - 64 * s} L${x + 20 * s},${y - 40 * s} Z`} fill="url(#shade)" />
      {glasses.map((g, i) => {
        const gx = x + (i % 2 ? 42 : -46) * s + i * 6 * s;
        const gy = y - 2 * s;
        return g === 'martini' ? (
          <g key={i} opacity="0.75">
            <path d={`M${gx - 11 * s},${gy - 24 * s} L${gx + 11 * s},${gy - 24 * s} L${gx},${gy - 11 * s} Z`} fill="#efe6da" opacity="0.55" />
            <rect x={gx - 1 * s} y={gy - 11 * s} width={2 * s} height={10 * s} fill="#efe6da" opacity="0.5" />
          </g>
        ) : (
          <g key={i}>
            <rect x={gx - 7 * s} y={gy - 16 * s} width={14 * s} height={15 * s} fill="#efe6da" opacity="0.22" />
            <rect x={gx - 7 * s} y={gy - 8 * s} width={14 * s} height={7 * s} fill="#e0863a" opacity="0.55" />
          </g>
        );
      })}
    </g>
  );
}

type PatronProps = {
  x: number;
  y: number;
  s?: number;
  hat?: boolean;
  bun?: boolean;
  cigar?: boolean;
  laugh?: 'left' | 'right';
};

// Seated listener seen from behind, facing the stage.
function Patron({ x, y, s = 1, hat, bun, cigar, laugh }: PatronProps) {
  const head = (
    <>
      <rect x={x - 7 * s} y={y - 82 * s} width={14 * s} height={14 * s} fill="#0b0706" />
      <ellipse cx={x} cy={y - 95 * s} rx={17 * s} ry={21 * s} fill="url(#patron)" />
      {hat && (
        <path
          d={`M${x - 30 * s},${y - 108 * s} Q${x},${y - 114 * s} ${x + 30 * s},${y - 108 * s} Q${x},${y - 101 * s} ${x - 30 * s},${y - 108 * s} Z M${x - 17 * s},${y - 108 * s} Q${x - 15 * s},${y - 133 * s} ${x},${y - 131 * s} Q${x + 15 * s},${y - 133 * s} ${x + 17 * s},${y - 108 * s} Z`}
          fill="#0b0706"
        />
      )}
      {bun && <circle cx={x + 4 * s} cy={y - 117 * s} r={9 * s} fill="url(#patron)" />}
    </>
  );
  return (
    <g>
      <path
        d={`M${x - 38 * s},${y} C${x - 42 * s},${y - 46 * s} ${x - 28 * s},${y - 74 * s} ${x},${y - 76 * s} C${x + 28 * s},${y - 74 * s} ${x + 42 * s},${y - 46 * s} ${x + 38 * s},${y} Z`}
        fill="url(#patron)"
      />
      {laugh ? (
        <g className={`laugh-${laugh}`} style={{ transformOrigin: `${x}px ${y - 76 * s}px` }}>
          {head}
        </g>
      ) : (
        head
      )}
      {cigar && (
        <g>
          <path
            d={`M${x + 30 * s},${y - 56 * s} L${x + 58 * s},${y - 74 * s} L${x + 50 * s},${y - 104 * s}`}
            stroke="#0d0807"
            strokeWidth={10 * s}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line x1={x + 52 * s} y1={y - 106 * s} x2={x + 70 * s} y2={y - 113 * s} stroke="#3b2418" strokeWidth={4 * s} strokeLinecap="round" />
          <circle className="ember" cx={x + 71 * s} cy={y - 113 * s} r={3 * s} fill="#ff9a4a" />
          {[0, -2.5, -5].map((delay) => (
            <path
              key={delay}
              className="wisp"
              d={`M${x + 71 * s},${y - 118 * s} c-8,-14 10,-22 2,-38 c-6,-12 8,-20 4,-34`}
              stroke="#efe6da"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function Tables() {
  return (
    <g>
      <Table x={70} y={650} s={0.8} glasses={['tumbler']} />
      <Patron x={40} y={735} s={0.8} hat />
      <Table x={1500} y={655} s={0.8} glasses={['martini']} />
      <Patron x={1530} y={738} s={0.8} bun />

      <Table x={310} y={682} glasses={['tumbler', 'martini']} />
      <Patron x={248} y={772} hat cigar />
      <Patron x={372} y={776} bun />

      <Table x={1190} y={690} glasses={['martini', 'tumbler']} />
      <Patron x={1128} y={780} hat laugh="right" />
      <Patron x={1258} y={778} bun laugh="left" />
    </g>
  );
}

function Foreground() {
  return (
    <g fill="#070403">
      <path d="M560,900 C562,846 594,826 650,826 C706,826 738,846 740,900 Z" />
      <rect x="566" y="860" width="168" height="8" fill="#1a0f0b" />
      <path d="M1320,900 C1324,832 1376,806 1450,806 C1524,806 1574,832 1580,900 Z" />
      <ellipse cx="1452" cy="768" rx="34" ry="42" />
      <path d="M1396,744 Q1452,734 1508,744 Q1452,756 1396,744 Z M1420,744 Q1424,700 1452,702 Q1480,700 1484,744 Z" />
    </g>
  );
}
