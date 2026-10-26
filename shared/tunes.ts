// The tune list. Seeds the database on the Mac and is the (read-only) list in the online copy.
// [title, concert key, status]. Concert keys from the charts in sheet-music/; null = not confirmed yet.
export const TUNES: [string, string | null, 'active' | 'queued'][] = [
  ['Autumn Leaves', 'G minor', 'active'],
  ['Naima', null, 'active'],
  ['Smooth Operator', 'F minor', 'active'],
  ['So What', 'D Dorian', 'queued'],
  ['In a Sentimental Mood', null, 'queued'],
  ['12-bar blues', 'F', 'queued'],
  ['Happy Birthday', 'E♭', 'queued'],
];
