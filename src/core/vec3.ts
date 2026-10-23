// 3D vectors. Same functions in the same order as core/vec2.ts, with z added.

export type Vec = { x: number; y: number; z: number };

export const ZERO: Vec = { x: 0, y: 0, z: 0 };

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

export const scale = (v: Vec, s: number): Vec => ({ x: v.x * s, y: v.y * s, z: v.z * s });

export const length = (v: Vec): number => Math.hypot(v.x, v.y, v.z);

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

/**
 * v turned 90° to the left around the vertical (y) axis. Used by the roost rule to circle around a point.
 * In 2D there is only one way to turn. In 3D we pick the vertical axis, so the flock circles level with the ground
 */
export const sideways = (v: Vec): Vec => ({ x: v.z, y: 0, z: -v.x });
