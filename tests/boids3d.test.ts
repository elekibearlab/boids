import { describe, expect, test } from 'vitest';
import * as flat from '@/core/boids2d';
import { avoidWalls, createFlock, createGridSearch, step } from '@/core/boids3d';
import { DEFAULT_PARAMS, viewRadius } from '@/core/params';
import { length } from '@/core/vec3';
import { seeded } from './seeded';

const AREA = { width: 160, height: 70, depth: 100 };

describe('3D is 2D with one more axis', () => {
  test('a flock with z = 0 everywhere moves exactly like the 2D flock', () => {
    const area2d = { width: 160, height: 90 };
    let flock2d = flat.createFlock(80, area2d, DEFAULT_PARAMS, seeded(4));
    let flock3d = flock2d.map(({ position, velocity }) => ({
      position: { ...position, z: 0 },
      velocity: { ...velocity, z: 0 },
    }));
    for (let i = 0; i < 60; i++) {
      flock2d = flat.step(flock2d, DEFAULT_PARAMS, area2d, 1 / 60);
      flock3d = step(flock3d, DEFAULT_PARAMS, { ...area2d, depth: 10 }, 1 / 60);
    }
    flock2d.forEach((crow, i) => {
      expect(flock3d[i].position.x).toBeCloseTo(crow.position.x, 9);
      expect(flock3d[i].position.y).toBeCloseTo(crow.position.y, 9);
      expect(flock3d[i].position.z).toBe(0);
    });
  });
});

describe('avoidWalls', () => {
  test('also pushes back on depth', () => {
    const crow = { position: { x: 0, y: 0, z: 60 }, velocity: { x: 0, y: 0, z: 0 } };
    expect(avoidWalls(crow, AREA)).toEqual({ x: 0, y: 0, z: -1 });
  });
});

describe('step', () => {
  test('keeps every speed between the lowest and highest', () => {
    let flock = createFlock(100, AREA, DEFAULT_PARAMS, seeded(5));
    for (let i = 0; i < 120; i++) {
      flock = step(flock, DEFAULT_PARAMS, AREA, 1 / 60);
    }
    for (const { velocity } of flock) {
      expect(length(velocity)).toBeGreaterThanOrEqual(DEFAULT_PARAMS.minSpeed - 1e-9);
      expect(length(velocity)).toBeLessThanOrEqual(DEFAULT_PARAMS.maxSpeed + 1e-9);
    }
  });

  test('the grid search gives the same flock as looking at every crow', () => {
    let simple = createFlock(150, AREA, DEFAULT_PARAMS, seeded(6));
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
      expect(grid[i].position.z).toBeCloseTo(crow.position.z, 6);
    });
  });
});
