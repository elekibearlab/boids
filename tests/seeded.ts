/**
 * A tiny random number generator that gives the same numbers for the same seed, so tests always see the same flock.
 *
 * @param seed Any whole number
 */
export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
