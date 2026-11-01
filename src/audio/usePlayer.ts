import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPlayer, type PlayOptions } from './player.ts';

/** React wrapper around the audio player: `playing` and the chart item under the cursor. */
export function usePlayer() {
  const player = useMemo(createPlayer, []);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>();
  const [bar, setBar] = useState<number | undefined>();

  useEffect(() => () => player.stop(), [player]);

  const stop = useCallback(() => {
    player.stop();
    setPlaying(false);
    setCursor(undefined);
    setBar(undefined);
  }, [player]);

  const play = useCallback(
    (o: Omit<PlayOptions, 'onCursor' | 'onEnd' | 'onBeat'> & { barBeats?: number }) => {
      player.play({
        ...o,
        onCursor: (item) => setCursor(item),
        // which bar is sounding: only changes (and re-renders) once a bar
        onBeat: o.barBeats ? (beat) => setBar(beat < 0 ? undefined : Math.floor(beat / o.barBeats!)) : undefined,
        onEnd: () => {
          setPlaying(false);
          setCursor(undefined);
          setBar(undefined);
        },
      });
      setPlaying(true);
    },
    [player],
  );

  return { playing, cursor, bar, play, stop, setBpm: player.setBpm };
}
