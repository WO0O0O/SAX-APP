import type { Stats } from './quiz.ts';

/** How much to fade a note's name under the staff (0 = full, 1 = gone), from what the student has shown they know. */
export function fadeFor(stat: Stats[number] | undefined): number {
  if (!stat || stat.answered < 3) return 0;
  const accuracy = stat.correct / stat.answered;
  if (accuracy >= 0.85 && stat.lookups <= 2) return 0.85;
  if (accuracy >= 0.7) return 0.5;
  return 0;
}
