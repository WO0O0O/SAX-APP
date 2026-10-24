import { lazy, Suspense, useState } from 'react';
import { BarScene } from './scene/BarScene.tsx';
import { SessionScreen } from './screens/SessionScreen.tsx';
import { ProgressScreen } from './screens/ProgressScreen.tsx';

// VexFlow is large; only load it when the reading screen opens.
const ReadingScreen = lazy(() => import('./screens/ReadingScreen.tsx'));

const SCREENS = [
  { id: 'session', label: 'Session' },
  { id: 'reading', label: 'Reading' },
  { id: 'progress', label: 'Progress' },
] as const;
type ScreenId = (typeof SCREENS)[number]['id'];

export function App() {
  const [screen, setScreenState] = useState<ScreenId>(
    () => SCREENS.find((s) => `#${s.id}` === location.hash)?.id ?? 'session',
  );
  const setScreen = (id: ScreenId) => {
    history.replaceState(null, '', `#${id}`);
    setScreenState(id);
  };
  const [dim, setDim] = useState(0.55);

  return (
    <>
      <BarScene dim={dim} />
      <div className="flex min-h-screen flex-col px-8 pb-6">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-4xl text-smoke">Sax Tutor</span>
            <span className="caps hidden text-ember/90 sm:inline">The Late Set</span>
          </div>
          <nav className="flex gap-1 rounded-full bg-ink/70 p-1.5" aria-label="Screens">
            {SCREENS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-current={screen === s.id ? 'page' : undefined}
                onClick={() => setScreen(s.id)}
                className={`min-h-12 rounded-full px-6 font-semibold transition-colors ${
                  screen === s.id ? 'bg-smoke text-ink' : 'text-smoke-dim hover:text-smoke'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="flex flex-1 flex-col">
          {screen === 'session' && <SessionScreen onSceneDim={setDim} />}
          {screen === 'reading' && (
            <Suspense fallback={null}>
              <ReadingScreen onSceneDim={setDim} />
            </Suspense>
          )}
          {screen === 'progress' && <ProgressScreen onSceneDim={setDim} />}
        </main>
      </div>
    </>
  );
}
