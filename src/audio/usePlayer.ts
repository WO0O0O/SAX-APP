import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPlayer, type PlayOptions } from './player.ts';

/** React wrapper around the audio player: `playing` and the chart item under the cursor. */
export function usePlayer() {
  const player = useMemo(createPlayer, []);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>();

  useEffect(() => () => player.stop(), [player]);

  const stop = useCallback(() => {
    player.stop();
    setPlaying(false);
    setCursor(undefined);
  }, [player]);

  const play = useCallback(
    (o: Omit<PlayOptions, 'onCursor' | 'onEnd'>) => {
      player.play({
        ...o,
        onCursor: (item) => setCursor(item),
        onEnd: () => {
          setPlaying(false);
          setCursor(undefined);
        },
      });
      setPlaying(true);
    },
    [player],
  );

  return { playing, cursor, play, stop, setBpm: player.setBpm };
}
