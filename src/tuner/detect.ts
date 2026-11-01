// Pitch detection: the McLeod Pitch Method (normalised square difference function), written out here
// so there is nothing to install. It is a pure function of a buffer, so it is tested with synthetic tones.

export type Detection = { hz: number; clarity: number };

export type DetectOptions = {
  /** Lowest and highest frequency to look for. A sax's fundamentals run about 138-880 Hz concert. */
  minHz?: number;
  maxHz?: number;
  /** A peak counts if it is at least this fraction of the highest one. 0.93 is the paper's value. */
  cutoff?: number;
};

export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/**
 * The fundamental of the buffer and how clear it is (0-1; a clean tone is above 0.9, noise is low),
 * or null if there is no periodic signal. About 2048 samples (40 ms) is enough for notes down to 110 Hz.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, { minHz = 100, maxHz = 1500, cutoff = 0.93 }: DetectOptions = {}): Detection | null {
  const n = buf.length;
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(sampleRate / minHz));
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));

  // nsdf[tau] = 2 * r'(tau) / m'(tau), where r' is the autocorrelation and m' the energy of both windows.
  const nsdf = new Float32Array(maxLag + 2);
  let m = 0;
  for (let i = 0; i < n; i++) m += 2 * buf[i] * buf[i];
  if (m === 0) return null;
  for (let tau = 0; tau <= maxLag; tau++) {
    let r = 0;
    for (let j = 0; j < n - tau; j++) r += buf[j] * buf[j + tau];
    nsdf[tau] = m > 0 ? (2 * r) / m : 0;
    m -= buf[tau] * buf[tau] + buf[n - 1 - tau] * buf[n - 1 - tau];
  }

  // Key maxima: the highest point of each positive stretch between zero crossings.
  const peaks: number[] = [];
  let tau = 1;
  while (tau < maxLag && nsdf[tau] > 0) tau++; // skip the first lobe around lag 0
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau] <= 0) tau++;
    let best = -1;
    while (tau < maxLag && nsdf[tau] > 0) {
      if (best < 0 || nsdf[tau] > nsdf[best]) best = tau;
      tau++;
    }
    if (best >= minLag && best < maxLag) peaks.push(best);
  }
  if (!peaks.length) return null;

  const highest = Math.max(...peaks.map((p) => nsdf[p]));
  const chosen = peaks.find((p) => nsdf[p] >= cutoff * highest);
  if (chosen === undefined) return null;

  // Parabola through the peak for a fractional lag (this is what gives sub-cent accuracy).
  const a = nsdf[chosen - 1];
  const b = nsdf[chosen];
  const c = nsdf[chosen + 1];
  const denom = a - 2 * b + c;
  const shift = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
  return { hz: sampleRate / (chosen + shift), clarity: b - 0.25 * (a - c) * shift };
}
