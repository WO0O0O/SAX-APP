import { lazy, Suspense, useState } from 'react';
import { BarScene } from './scene/BarScene.tsx';
import { NotesScreen } from './screens/NotesScreen.tsx';
import { ProgressScreen } from './screens/ProgressScreen.tsx';

// VexFlow is large; only load it on the screens that draw notation.
const ScalesScreen = lazy(() => import('./screens/ScalesScreen.tsx'));
const ReadingScreen = lazy(() => import('./screens/ReadingScreen.tsx'));
const TunesScreen = lazy(() => import('./screens/TunesScreen.tsx'));

const SCREENS = [
  { id: 'scales', label: 'Scales' },
  { id: 'notes', label: 'All notes' },
  { id: 'tunes', label: 'Tunes' },
  { id: 'reading', label: 'Reading' },
  { id: 'progress', label: 'Progress' },
] as const;
type ScreenId = (typeof SCREENS)[number]['id'];

export function App() {
  const [screen, setScreenState] = useState<ScreenId>(
    () => SCREENS.find((s) => `#${s.id}` === location.hash)?.id ?? 'scales',
  );
  const [dim, setDim] = useState(0.7);
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
            <span className="caps-xs hidden text-ember/90 sm:inline">The Late Set</span>
          </div>
          <nav className="flex gap-1 rounded-full bg-ink/70 p-1" aria-label="Screens">
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
        </header>

        <main className="flex flex-1 flex-col">
          <Suspense fallback={null}>
            {screen === 'scales' && <ScalesScreen onSceneDim={setDim} />}
            {screen === 'notes' && <NotesScreen onSceneDim={setDim} />}
            {screen === 'tunes' && <TunesScreen onSceneDim={setDim} />}
            {screen === 'reading' && <ReadingScreen onSceneDim={setDim} />}
            {screen === 'progress' && <ProgressScreen onSceneDim={setDim} />}
          </Suspense>
        </main>
      </div>
    </>
  );
}
