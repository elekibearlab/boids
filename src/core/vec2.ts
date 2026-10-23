// 2D vectors. Plain { x, y } objects and short functions, so the Boids formulas read as they are.
// core/vec3.ts has the same functions in the same order, with z added.

export type Vec = { x: number; y: number };

export const ZERO: Vec = { x: 0, y: 0 };

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (v: Vec, s: number): Vec => ({ x: v.x * s, y: v.y * s });

export const length = (v: Vec): number => Math.hypot(v.x, v.y);

/**
 * Keeps the length of v between min and max, without changing its direction.
 *
 * @param v   Vector to limit
 * @param min Smallest length allowed
 * @param max Largest length allowed
 */
export function clampLength(v: Vec, min: number, max: number): Vec {
  const len = length(v);
  if (len === 0) {
    return v;
  }
  return scale(v, Math.min(Math.max(len, min), max) / len);
}

/** v turned 90° to the left. Used by the roost rule to circle around a point */
export const sideways = (v: Vec): Vec => ({ x: -v.y, y: v.x });
