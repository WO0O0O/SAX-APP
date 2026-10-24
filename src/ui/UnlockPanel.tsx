import { useState, type FormEvent } from 'react';
import { unlock } from '../sealed.ts';

/** Passphrase prompt for the sheet music in the online copy. Remembered on this device. */
export function UnlockPanel({ onUnlocked }: { onUnlocked: () => void }) {
  const [pass, setPass] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'wrong'>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('checking');
    if (await unlock(pass)) onUnlocked();
    else setState('wrong');
  };

  return (
    <form onSubmit={submit} className="panel max-w-xl p-6">
      <h2 className="font-display text-2xl">Unlock the sheet music</h2>
      <p className="mt-1 text-sm text-smoke-dim">
        The charts and PDFs are encrypted in the online copy. Enter your passphrase once; this device will remember it.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          type="password"
          autoComplete="current-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          aria-label="Passphrase"
          className="min-w-0 flex-1 rounded-lg border border-walnut bg-ink/60 px-3 py-2"
        />
        <button type="submit" disabled={!pass || state === 'checking'} className="rounded-full bg-brass px-5 font-semibold text-ink disabled:opacity-50">
          {state === 'checking' ? 'Checking…' : 'Unlock'}
        </button>
      </div>
      {state === 'wrong' && <p className="mt-2 text-sm text-ember">That passphrase didn't work.</p>}
    </form>
  );
}
