import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brass text-ink hover:bg-[#d8b46e]',
  secondary: 'border-2 border-smoke/70 text-smoke hover:bg-smoke/10',
  danger: 'bg-oxblood text-smoke hover:bg-wine',
  ghost: 'text-smoke-dim hover:text-smoke hover:bg-smoke/5',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  shortcut?: string;
};

export function Button({ variant = 'secondary', shortcut, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center gap-3 rounded-full px-7 text-[1.05rem] font-semibold transition-colors ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
      {shortcut && <Keycap>{shortcut}</Keycap>}
    </button>
  );
}

export function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-current/40 px-1.5 py-0.5 font-sans text-[0.7rem] font-semibold opacity-70">
      {children}
    </kbd>
  );
}

const LOAD_STYLE = {
  low: 'border-smoke/40 text-smoke-dim',
  med: 'border-ember/70 text-ember',
  high: 'border-wine bg-oxblood/60 text-smoke',
};

export function LipLoad({ load }: { load: 'low' | 'med' | 'high' }) {
  return <span className={`caps rounded-full border px-3 py-1 ${LOAD_STYLE[load]}`}>Lip load · {load}</span>;
}

/** mm:ss in fixed-width cells so the digits don't jitter as they change. */
export function Clock({ seconds, className = '' }: { seconds: number; className?: string }) {
  const s = Math.max(0, Math.ceil(seconds));
  const text = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <span className={`font-display leading-none ${className}`} role="timer" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className="inline-block text-center" style={{ width: ch === ':' ? '0.32em' : '0.62em' }}>
          {ch}
        </span>
      ))}
    </span>
  );
}
