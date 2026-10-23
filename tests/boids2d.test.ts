import { describe, expect, test } from 'vitest';
import {
  alignment,
  avoidWalls,
  type Boid,
  cohesion,
  createFlock,
  createGridSearch,
  separation,
  step,
} from '@/core/boids2d';
import { DEFAULT_PARAMS, viewRadius } from '@/core/params';
import { length } from '@/core/vec2';
import { seeded } from './seeded';

const AREA = { width: 160, height: 90 };

/** A crow at (x, y) flying with velocity (vx, vy) */
const boid = (x: number, y: number, vx = 0, vy = 0): Boid => ({
  position: { x, y },
  velocity: { x: vx, y: vy },
});

describe('separation', () => {
  test('pushes away from a crow that is too close', () => {
    const self = boid(0, 0);
    const force = separation(self, [self, boid(2, 0)], 6);
    expect(force.x).toBeLessThan(0);
    expect(force.y).toBeCloseTo(0);
  });

  test('a closer crow pushes harder', () => {
    const self = boid(0, 0);
    const near = separation(self, [boid(1, 0)], 6);
    const far = separation(self, [boid(4, 0)], 6);
    expect(length(near)).toBeGreaterThan(length(far));
  });

  test('ignores crows outside the radius', () => {
    expect(separation(boid(0, 0), [boid(10, 0)], 6)).toEqual({ x: 0, y: 0 });
  });
});

describe('alignment', () => {
  test('returns the average velocity of the others minus my own', () => {
    const self = boid(0, 0, 10, 0);
    const force = alignment(self, [self, boid(1, 0, 0, 10), boid(-1, 0, 0, 20)], 10);
    expect(force.x).toBeCloseTo(-10);
    expect(force.y).toBeCloseTo(15);
  });
});

describe('cohesion', () => {
  test('points from me to the center of the others', () => {
    const self = boid(0, 0);
    const force = cohesion(self, [self, boid(4, 2), boid(4, -2)], 10);
    expect(force.x).toBeCloseTo(4);
    expect(force.y).toBeCloseTo(0);
  });
});

describe('avoidWalls', () => {
  test('pushes back only on the axis that is outside', () => {
    expect(avoidWalls(boid(100, 0), AREA)).toEqual({ x: -1, y: 0 });
    expect(avoidWalls(boid(0, -50), AREA)).toEqual({ x: 0, y: 1 });
    expect(avoidWalls(boid(0, 0), AREA)).toEqual({ x: 0, y: 0 });
  });
});

describe('step', () => {
  test('keeps every speed between the lowest and highest', () => {
    let flock = createFlock(100, AREA, DEFAULT_PARAMS, seeded(1));
    for (let i = 0; i < 120; i++) {
      flock = step(flock, DEFAULT_PARAMS, AREA, 1 / 60);
    }
    for (const { velocity } of flock) {
      expect(length(velocity)).toBeGreaterThanOrEqual(DEFAULT_PARAMS.minSpeed - 1e-9);
      expect(length(velocity)).toBeLessThanOrEqual(DEFAULT_PARAMS.maxSpeed + 1e-9);
    }
  });

  test('the grid search gives the same flock as looking at every crow', () => {
    let simple = createFlock(150, AREA, DEFAULT_PARAMS, seeded(2));
    let grid = simple;
    for (let i = 0; i < 60; i++) {
      simple = step(simple, DEFAULT_PARAMS, AREA, 1 / 60);
      grid = step(
        grid,
        DEFAULT_PARAMS,
        AREA,
        1 / 60,
        undefined,
        createGridSearch(grid, viewRadius(DEFAULT_PARAMS)),
      );
    }
    simple.forEach((crow, i) => {
      expect(grid[i].position.x).toBeCloseTo(crow.position.x, 6);
      expect(grid[i].position.y).toBeCloseTo(crow.position.y, 6);
    });
  });

  test('the same random numbers make the same flock', () => {
    expect(createFlock(10, AREA, DEFAULT_PARAMS, seeded(3))).toEqual(
      createFlock(10, AREA, DEFAULT_PARAMS, seeded(3)),
    );
  });
});
