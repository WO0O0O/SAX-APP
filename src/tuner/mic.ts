import { engine } from '../audio/engine.ts';

// The microphone, set up like the iOS app's `.measurement` audio mode: the browser's voice processing
// (echo cancellation, noise suppression, auto gain) is switched off so it doesn't bend the pitch or the level.
// The audio is analysed in the browser and never sent anywhere.

export type MicErrorKind = 'unsupported' | 'denied' | 'nomic' | 'failed';
export class MicError extends Error {
  kind: MicErrorKind;
  constructor(kind: MicErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export type Mic = {
  sampleRate: number;
  /** Fills `buf` with the most recent samples. */
  read: (buf: Float32Array) => void;
  close: () => void;
};

export const MIC_WINDOW = 2048;

export async function openMic(): Promise<Mic> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unsupported', location.protocol === 'http:' && location.hostname !== 'localhost' ? 'The microphone needs a secure (https) page.' : 'This browser cannot use the microphone.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicError('denied', 'Microphone access was blocked. Allow it for this site in the browser, then try again.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new MicError('nomic', 'No microphone found.');
    throw new MicError('failed', `Could not open the microphone (${name}).`);
  }
  const { ctx } = engine();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  // Some browsers only pull audio through nodes that reach the output, so end in a muted gain: nothing is heard, no feedback.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  analyser.connect(mute).connect(ctx.destination);
  const all = new Float32Array(analyser.fftSize);
  return {
    sampleRate: ctx.sampleRate,
    read: (buf) => {
      analyser.getFloatTimeDomainData(all);
      buf.set(all.subarray(all.length - buf.length));
    },
    close: () => {
      source.disconnect();
      analyser.disconnect();
      mute.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
