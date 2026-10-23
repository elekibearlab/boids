// Numbers that decide how the flock moves. 2D and 3D use the same ones.
// Lengths are in world units (a crow is about 3 long), times in seconds.

export type Params = {
  /** Crows closer than this push each other away (separation) */
  separationRadius: number;
  /** Crows within this distance try to fly the same way (alignment) */
  alignmentRadius: number;
  /** Crows within this distance move toward their center (cohesion) */
  cohesionRadius: number;

  /** How strong each rule is. 0 turns the rule off */
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;

  /** Speed limits. Crows can't hover, so there is a lowest speed too */
  minSpeed: number;
  maxSpeed: number;

  /**
   * How hard a crow is pushed back when it goes outside the area.
   * It only starts pushing outside, so a crow overshoots by about maxSpeed² / (2 × this): 5 at 100
   */
  avoidWallWeight: number;

  /** Crows closer than this to the threat (hawk / cursor) fly away from it */
  fleeRadius: number;
  fleeWeight: number;
  /** How strongly crows head to the roost, and how strongly they circle around it */
  roostWeight: number;
  roostSwirl: number;
};

/** Values at the start. Tuned so all three rules together make one or two flocks that keep moving */
export const DEFAULT_PARAMS: Params = {
  separationRadius: 6,
  alignmentRadius: 10,
  cohesionRadius: 14,

  separationWeight: 120,
  alignmentWeight: 2,
  cohesionWeight: 1,

  minSpeed: 16,
  maxSpeed: 32,

  avoidWallWeight: 100,

  fleeRadius: 22,
  fleeWeight: 220,
  roostWeight: 0.6,
  roostSwirl: 1.2,
};

/** The largest distance any rule looks at. The grid search uses it as its cell size */
export function viewRadius(params: Params): number {
  return Math.max(params.separationRadius, params.alignmentRadius, params.cohesionRadius);
}
