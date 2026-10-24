import { forwardRef, useState } from 'react';
import { atMidi, nameOf, noteName, writtenToConcert, type Note } from '../../shared/theory.ts';
import { STUDENT_RANGE } from '../../shared/student.ts';
import { FingeringDiagram } from './FingeringDiagram.tsx';
import { NoteText } from '../ui/NoteText.tsx';
import { FINGERINGS, describe } from './fingerings.ts';

type Props = {
  note: Note;
  /** Extra name shown after the main one, e.g. 'D♭' for C♯. */
  altName?: string;
  selected?: boolean;
  onSelect?: () => void;
};

export const FingeringCard = forwardRef<HTMLElement, Props>(function FingeringCard({ note, altName, selected, onSelect }, ref) {
  const options = FINGERINGS[note.midi] ?? [];
  const [choice, setChoice] = useState(0);
  const fingering = options[Math.min(choice, options.length - 1)];
  const concert = atMidi(writtenToConcert(note), note.midi - 9);
  const stretch = note.midi < STUDENT_RANGE.low || note.midi > STUDENT_RANGE.high;

  return (
    <article
      ref={ref}
      onClick={onSelect}
      className={`flex cursor-default flex-col rounded-xl border bg-mahogany/90 p-3 transition-colors ${
        selected ? 'border-ember shadow-[0_0_0_1px_var(--color-ember)]' : 'border-walnut/80 hover:border-leather'
      }`}
    >
      <header className="flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl leading-none">
          <NoteText text={noteName(note)} />
          {altName && <span className="ml-1 font-sans text-sm text-smoke-dim">/ {altName}</span>}
        </span>
        {stretch && <span className="caps-xs text-ember/90">stretch</span>}
      </header>
      <p className="mt-0.5 text-xs text-smoke-dim">sounds {nameOf(concert)}{concert.octave}</p>
      <div className="mx-auto my-2 w-full max-w-[120px]">
        {fingering && <FingeringDiagram pressed={fingering.keys} compact />}
      </div>
      {options.length > 1 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setChoice(i);
              }}
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                i === choice ? 'bg-smoke text-ink' : 'border border-smoke/25 text-smoke-dim hover:text-smoke'
              }`}
            >
              {o.name ?? 'Standard'}
            </button>
          ))}
        </div>
      )}
      {fingering && (
        <ul className="text-xs leading-snug text-smoke/85">
          {describe(fingering.keys).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </article>
  );
});
