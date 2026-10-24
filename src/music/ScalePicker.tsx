import { nameOf, parseSpelling } from '../../shared/theory.ts';
import { CircleDial } from './CircleDial.tsx';
import { GROUPS, SCALES } from './scales.ts';
import type { usePicker } from './usePicker.ts';

/** Circle of fifths + scale list. */
export function ScalePicker({ picker }: { picker: ReturnType<typeof usePicker> }) {
  const { pos, tonic, altName, scale, setPos, toggleSpelling, setScale } = picker;
  return (
    <div className="panel space-y-4 p-4">
      <CircleDial pos={pos} tonic={tonic} onChange={setPos} />
      {altName && (
        <button type="button" onClick={toggleSpelling} className="mx-auto block text-sm text-brass hover:underline">
          Spell as {nameOf(parseSpelling(altName))} instead
        </button>
      )}
      <nav aria-label="Scales" className="space-y-3">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="caps-xs mb-1 px-2 text-smoke-dim">{group}</p>
            <ul>
              {SCALES.filter((s) => s.group === group).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={s.id === scale.id ? 'true' : undefined}
                    onClick={() => setScale(s.id)}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-[0.95rem] transition-colors ${
                      s.id === scale.id ? 'bg-ember/20 text-smoke' : 'text-smoke/80 hover:bg-smoke/5 hover:text-smoke'
                    }`}
                  >
                    {s.name}
                    {s.aka && <span className="text-smoke-dim"> · {s.aka}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
