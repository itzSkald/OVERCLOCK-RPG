import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../engine/types';
import type { GameEngine } from '../engine/Engine';

export function useGameState<T>(engine: GameEngine, selector: (s: GameState) => T): T {
  const [value, setValue] = useState<T>(() => selector(engine.state));
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  useEffect(() => {
    return engine.subscribeState(state => {
      setValue(selectorRef.current(state));
    });
  }, [engine]);

  return value;
}
