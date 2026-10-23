/**
 * Follows the cursor (or a finger) over the canvas, for the "flee" preset.
 * It only keeps the last position; the scene reads it each frame.
 *
 * @param canvas Canvas that gets pointer input
 * @returns The current position (px, the top left of the canvas is 0) or null when the pointer is outside,
 *          and a function that removes the events
 */
export function attachPointerThreat(canvas: HTMLCanvasElement): {
  current: () => { px: number; py: number } | null;
  detach: () => void;
} {
  let position: { px: number; py: number } | null = null;

  const move = (event: PointerEvent) => {
    position = { px: event.offsetX, py: event.offsetY };
  };
  const leave = () => {
    position = null;
  };

  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', move);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointercancel', leave);
  return {
    current: () => position,
    detach: () => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointercancel', leave);
    },
  };
}
