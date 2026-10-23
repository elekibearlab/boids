import type { Params } from './params';
import { add, clampLength, length, scale, sideways, sub, type Vec, ZERO } from './vec2';

// The whole 2D Boids. Read from top to bottom:
//   the three rules (separation → alignment → cohesion) → add them up (steering force) → move one step.
// core/boids3d.ts is in the same order. The only difference is that vectors have a z.

/** One crow. Only a position and a velocity (world units per second) */
export type Boid = {
  position: Vec;
  velocity: Vec;
};

/** The area the flock stays in. A rectangle centered at (0, 0) */
export type Area = {
  width: number;
  height: number;
};

/**
 * Makes a flock at random places in the area, each flying in a random direction.
 *
 * @param count  Number of crows
 * @param area   Area to spread them over
 * @param params Used for the starting speed (halfway between the lowest and highest)
 * @param random Returns a random number in [0, 1). Tests pass their own to get the same flock every time
 */
export function createFlock(
  count: number,
  area: Area,
  params: Params,
  random: () => number = Math.random,
): Boid[] {
  const speed = (params.minSpeed + params.maxSpeed) / 2;
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    return {
      position: { x: (random() - 0.5) * area.width, y: (random() - 0.5) * area.height },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    };
  });
}

// ---- The three rules ----
// Each one looks at the other crows near `self` and returns one force.

/**
 * Separation: move away from crows that are too close.
 * Adds up "my position − their position" for each close crow. Dividing by the squared distance
 * makes closer crows push harder (the length becomes 1 / distance).
 *
 * @param self   The crow that moves
 * @param others Crows to look at. `self` may be among them; it is skipped
 * @param radius Only crows closer than this count
 */
export function separation(self: Boid, others: Boid[], radius: number): Vec {
  let sum = ZERO;
  let count = 0;
  for (const other of others) {
    const away = sub(self.position, other.position);
    const distance = length(away);
    if (other === self || distance === 0 || distance > radius) {
      continue;
    }
    sum = add(sum, scale(away, 1 / (distance * distance)));
    count++;
  }
  return count > 0 ? scale(sum, 1 / count) : ZERO;
}

/**
 * Alignment: fly the same way as the crows nearby.
 * Averages their velocities (not positions), and returns how far that is from my own velocity.
 *
 * @param self   The crow that moves
 * @param others Crows to look at. `self` may be among them; it is skipped
 * @param radius Only crows closer than this count
 */
export function alignment(self: Boid, others: Boid[], radius: number): Vec {
  let sum = ZERO;
  let count = 0;
  for (const other of others) {
    const distance = length(sub(self.position, other.position));
    if (other === self || distance > radius) {
      continue;
    }
    sum = add(sum, other.velocity);
    count++;
  }
  if (count === 0) {
    return ZERO;
  }
  const average = scale(sum, 1 / count);
  return sub(average, self.velocity);
}

/**
 * Cohesion: move toward the center of the crows nearby.
 * Averages their positions, and returns the way from my position to that center.
 *
 * @param self   The crow that moves
 * @param others Crows to look at. `self` may be among them; it is skipped
 * @param radius Only crows closer than this count
 */
export function cohesion(self: Boid, others: Boid[], radius: number): Vec {
  let sum = ZERO;
  let count = 0;
  for (const other of others) {
    const distance = length(sub(self.position, other.position));
    if (other === self || distance > radius) {
      continue;
    }
    sum = add(sum, other.position);
    count++;
  }
  if (count === 0) {
    return ZERO;
  }
  const center = scale(sum, 1 / count);
  return sub(center, self.position);
}

/**
 * Steering force: the three rules, each times its weight, added up.
 *
 * @param self   The crow that moves
 * @param others Crows to look at
 * @param params Distances and weights of the rules
 */
export function steer(self: Boid, others: Boid[], params: Params): Vec {
  const s = scale(separation(self, others, params.separationRadius), params.separationWeight);
  const a = scale(alignment(self, others, params.alignmentRadius), params.alignmentWeight);
  const c = scale(cohesion(self, others, params.cohesionRadius), params.cohesionWeight);
  return add(add(s, a), c);
}

// ---- Extra forces. Not part of the three rules ----

/**
 * Pushes the crow back when it is outside the area: +1 on each axis where it is past the low side, −1 past the high side.
 *
 * @param self The crow that moves
 * @param area Area to stay in
 */
export function avoidWalls(self: Boid, area: Area): Vec {
  const { x, y } = self.position;
  const halfW = area.width / 2;
  const halfH = area.height / 2;
  return {
    x: x < -halfW ? 1 : x > halfW ? -1 : 0,
    y: y < -halfH ? 1 : y > halfH ? -1 : 0,
  };
}

/**
 * Flee: fly away from a threat (the cursor or a hawk). The closer it is, the harder.
 *
 * @param self   The crow that moves
 * @param threat Position of the threat
 * @param radius Crows farther than this don't notice it
 */
export function flee(self: Boid, threat: Vec, radius: number): Vec {
  const away = sub(self.position, threat);
  const distance = length(away);
  if (distance === 0 || distance > radius) {
    return ZERO;
  }
  // Length 1 right next to the threat, 0 at the edge of the radius
  return scale(away, (radius - distance) / (radius * distance));
}

/**
 * Roost: head to a point and circle around it, like crows over their roost at dusk.
 * "Toward the point" pulls them in, and "sideways from that" makes them go around instead of piling up.
 *
 * @param self   The crow that moves
 * @param center The roost
 * @param params roostWeight (pull in) and roostSwirl (go around)
 */
export function roost(self: Boid, center: Vec, params: Params): Vec {
  const toward = sub(center, self.position);
  const around = sideways(toward);
  return add(scale(toward, params.roostWeight), scale(around, params.roostSwirl));
}

/** What else acts on the flock besides the three rules. null means off */
export type Extras = {
  threat: Vec | null;
  roost: Vec | null;
};

export const NO_EXTRAS: Extras = { threat: null, roost: null };

// ---- One step ----

/**
 * Gives the crows to look at for `self`. The simple version is "every crow".
 * The grid version (createGridSearch) gives only the crows in nearby cells, for big flocks
 */
export type Search = (boids: Boid[], self: Boid) => Boid[];

/**
 * Looks at every crow. Easy to read, but each crow checks all the others,
 * so the work grows with the square of the count (N²): 10 times the crows is 100 times the work.
 */
export const searchAll: Search = (boids) => boids;

/**
 * Returns the flock one step later.
 * All crows move at the same time, so it makes new crows and leaves the old ones as they are.
 *
 * Order: steering force → push back from walls → velocity += force × dt → limit the speed → position += velocity × dt
 *
 * @param boids  Current flock
 * @param params Distances, weights and speed limits
 * @param area   Area to stay in
 * @param dt     Seconds to move forward
 * @param extras Threat and roost, if they are on
 * @param search Which crows each crow looks at. Same result either way; the grid is only faster
 */
export function step(
  boids: Boid[],
  params: Params,
  area: Area,
  dt: number,
  extras: Extras = NO_EXTRAS,
  search: Search = searchAll,
): Boid[] {
  return boids.map((self) => {
    let force = steer(self, search(boids, self), params);
    force = add(force, scale(avoidWalls(self, area), params.avoidWallWeight));
    if (extras.threat) {
      force = add(force, scale(flee(self, extras.threat, params.fleeRadius), params.fleeWeight));
    }
    if (extras.roost) {
      force = add(force, roost(self, extras.roost, params));
    }

    const velocity = clampLength(
      add(self.velocity, scale(force, dt)),
      params.minSpeed,
      params.maxSpeed,
    );
    const position = add(self.position, scale(velocity, dt));
    return { position, velocity };
  });
}

/**
 * Makes a faster search for big flocks. The same idea as counting only nearby cells in the Game of Life:
 * put each crow in a grid cell as big as the farthest view distance, then look only at the 3 × 3 cells around.
 * Crows farther than one cell can't be in view, so the result is the same as searchAll.
 *
 * @param boids    The flock to search. Make a new search each step, because the crows move
 * @param cellSize At least the largest view distance (viewRadius in params.ts)
 */
export function createGridSearch(boids: Boid[], cellSize: number): Search {
  const cellOf = (v: Vec) => [Math.floor(v.x / cellSize), Math.floor(v.y / cellSize)];
  const key = (cx: number, cy: number) => `${cx},${cy}`;
  const cells = new Map<string, Boid[]>();
  for (const boid of boids) {
    const [cx, cy] = cellOf(boid.position);
    const list = cells.get(key(cx, cy));
    if (list) {
      list.push(boid);
    } else {
      cells.set(key(cx, cy), [boid]);
    }
  }
  return (_, self) => {
    const [cx, cy] = cellOf(self.position);
    const near: Boid[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        near.push(...(cells.get(key(cx + dx, cy + dy)) ?? []));
      }
    }
    return near;
  };
}
