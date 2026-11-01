import { lazy, Suspense, useEffect, useState } from 'react';
import { BarScene } from './scene/BarScene.tsx';
import { NotesScreen } from './screens/NotesScreen.tsx';
import { ProgressScreen } from './screens/ProgressScreen.tsx';
import { HOSTED } from './mode.ts';
import { setVolume } from './audio/engine.ts';
import { setSettings, useAudioSettings } from './audio/settings.ts';
import { ToolsButton, ToolsPanel } from './ui/ToolsPanel.tsx';

// VexFlow is large; only load it on the screens that draw notation.
const ScalesScreen = lazy(() => import('./screens/ScalesScreen.tsx'));
const ReadingScreen = lazy(() => import('./screens/ReadingScreen.tsx'));
const TunesScreen = lazy(() => import('./screens/TunesScreen.tsx'));
const QuizScreen = lazy(() => import('./screens/QuizScreen.tsx'));
const EarScreen = lazy(() => import('./screens/EarScreen.tsx'));

const ALL_SCREENS = [
  { id: 'scales', label: 'Scales' },
  { id: 'notes', label: 'All notes' },
  { id: 'tunes', label: 'Tunes' },
  { id: 'reading', label: 'Reading' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'ear', label: 'Ear' },
  { id: 'progress', label: 'Progress' },
] as const;
type ScreenId = (typeof ALL_SCREENS)[number]['id'];
// Progress needs the Mac's database, so the online copy leaves it out.
const SCREENS = ALL_SCREENS.filter((s) => !HOSTED || s.id !== 'progress');

/** Sound preferences: tapping notes plays them, and a master volume. */
function SoundControls() {
  const { tapSounds, volume } = useAudioSettings();
  return (
    <div className="flex items-center gap-3 rounded-full bg-ink/70 px-3 py-1.5 text-sm text-smoke-dim">
      <label className="flex cursor-pointer items-center gap-2 hover:text-smoke" title="Tapping a note or fingering plays it">
        <input type="checkbox" checked={tapSounds} onChange={(e) => setSettings({ tapSounds: e.target.checked })} className="size-4 accent-ember" />
        Tap sounds
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => {
          const v = Number(e.target.value);
          setSettings({ volume: v });
          setVolume(v);
        }}
        className="hidden w-20 accent-ember sm:block"
        aria-label="Volume"
      />
    </div>
  );
}

export function App() {
  const [screen, setScreenState] = useState<ScreenId>(
    () => SCREENS.find((s) => `#${s.id}` === location.hash)?.id ?? 'scales',
  );
  const [dim, setDim] = useState(0.7);
  // Links elsewhere in the app (e.g. "open in Scales") navigate by changing the hash.
  useEffect(() => {
    const onHash = () => {
      const id = SCREENS.find((s) => `#${s.id}` === location.hash)?.id;
      if (id) setScreenState(id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setScreen = (id: ScreenId) => {
    history.replaceState(null, '', `#${id}`);
    setScreenState(id);
  };

  return (
    <>
      <BarScene dim={dim} />
      <div className="flex min-h-screen flex-col px-5 pb-10 md:px-8">
        <header className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl text-smoke">Sax Tutor</span>
            <span className="caps-xs hidden text-ember/90 sm:inline">{HOSTED ? 'Online copy' : 'The Late Set'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <SoundControls />
          <ToolsButton />
          <nav className="flex flex-wrap gap-1 rounded-full bg-ink/70 p-1" aria-label="Screens">
            {SCREENS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-current={screen === s.id ? 'page' : undefined}
                onClick={() => setScreen(s.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  screen === s.id ? 'bg-smoke text-ink' : 'text-smoke-dim hover:text-smoke'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          <Suspense fallback={null}>
            {screen === 'scales' && <ScalesScreen onSceneDim={setDim} />}
            {screen === 'notes' && <NotesScreen onSceneDim={setDim} />}
            {screen === 'tunes' && <TunesScreen onSceneDim={setDim} />}
            {screen === 'quiz' && <QuizScreen onSceneDim={setDim} />}
            {screen === 'ear' && <EarScreen onSceneDim={setDim} />}
            {screen === 'reading' && <ReadingScreen onSceneDim={setDim} />}
            {screen === 'progress' && <ProgressScreen onSceneDim={setDim} />}
          </Suspense>
        </main>
      </div>
      <ToolsPanel />
    </>
  );
}
