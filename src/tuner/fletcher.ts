// Fletcher mode, an opt-in: the iOS Blue Note Tuner's feedback lines (the *****s are in the originals).

export const FLAT = [
  'ARE YOU RUSHING OR ARE YOU DRAGGING?!',
  "YOU'RE FLAT, YOU *****!",
  "MY GRANDMOTHER PLAYS SHARPER THAN YOU, AND SHE'S INTERRED!",
  'IF YOU PLAY ONE MORE FLAT NOTE I WILL ***** HURL THIS TUNER AT YOUR HEAD!',
  'WERE YOU BORN WITHOUT EARS OR JUST WITHOUT A ***** SOUL?',
];
export const SHARP = [
  "TOO SHARP! YOU'RE BURNING MY ***** EARS!",
  'NOT QUITE MY TEMPO, YOU *****!',
  "YOU'RE SO SHARP YOU'RE PRACTICALLY IN THE NEXT ***** KEY!",
  'STOP PUSHING THE AIR LIKE A ***** AMATEUR!',
  'IS THAT A SAXOPHONE OR A ***** TEA KETTLE?!',
];
export const IN_TUNE = ["DON'T GET COMPLACENT.", "FOR ONCE, YOU'RE NOT A COMPLETE ***** DISASTER.", 'ACCEPTABLE. BARELY.', "STAY THERE. DON'T YOU ***** MOVE."];

export function feedback(cents: number, tuned: boolean, random: () => number = Math.random): string {
  const list = tuned ? IN_TUNE : cents < 0 ? FLAT : SHARP;
  return list[Math.floor(random() * list.length)];
}

/** Long-tone messages: plain, or Fletcher's. */
export function dropMessage(reason: 'sharp' | 'flat' | 'silence' | 'changed', fletcher: boolean): string {
  if (fletcher) {
    if (reason === 'silence') return 'BREATH SUPPORT, NOT WISHFUL THINKING.';
    if (reason === 'changed') return 'I DID NOT SAY YOU COULD CHANGE NOTES.';
    return `YOU DROPPED IT! PITCH WENT ${reason.toUpperCase()}.`;
  }
  if (reason === 'silence') return 'Stopped. Keep the air steady.';
  if (reason === 'changed') return 'New note: a new hold.';
  return `Dropped: the pitch went ${reason}.`;
}
