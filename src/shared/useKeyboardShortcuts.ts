import { useEffect, useRef } from 'react';

/** A key and what it does. Keys are KeyboardEvent.code values */
export type Shortcuts = Record<string, () => void>;

/**
 * Adds keyboard shortcuts for the whole screen.
 * This lets us control it while recording a video, without moving the mouse to the panel.
 *
 * @param shortcuts Actions by KeyboardEvent.code. Each render uses the latest ones
 */
export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && event.code !== 'ArrowRight') {
        return;
      }
      const action = ref.current[event.code];
      if (!action) {
        return;
      }
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
