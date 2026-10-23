import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
} from 'three';
import type { Boid } from '@/core/boids2d';
import type { Params } from '@/core/params';

/** Points on each circle. Enough to look round at full screen */
const CIRCLE_SEGMENTS = 64;
/** One color for each rule. The panel sliders use the same order: separation, alignment, cohesion */
const SEPARATION_COLOR = 0xd7263d;
const ALIGNMENT_COLOR = 0xf2a900;
const COHESION_COLOR = 0x1b6ca8;
/** Lines from the crow to the crows it sees */
const LINK_COLOR = 0x2b2d42;

/**
 * Shows how far one crow (the first in the flock) sees: a circle for each rule's distance,
 * and a line to every crow inside the largest circle. For explaining only; it doesn't change the rules.
 */
export type RangeGuide = {
  group: Group;
  /** Call this every frame while it is shown */
  update: (flock: Boid[], params: Params) => void;
  dispose: () => void;
};

/**
 * Makes the guide. It starts hidden; set group.visible to show it.
 *
 * @param count Number of crows, the most lines it may need
 */
export function createRangeGuide(count: number): RangeGuide {
  const group = new Group();
  group.visible = false;

  // A circle of radius 1. Each rule scales it to its own distance
  const circle = new BufferGeometry();
  const points = new Float32Array((CIRCLE_SEGMENTS + 1) * 3);
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    points.set([Math.cos(angle), Math.sin(angle), 0], i * 3);
  }
  circle.setAttribute('position', new BufferAttribute(points, 3));
  const rings = [SEPARATION_COLOR, ALIGNMENT_COLOR, COHESION_COLOR].map((color) => {
    const ring = new LineLoop(circle, new LineBasicMaterial({ color }));
    group.add(ring);
    return ring;
  });

  const linkPositions = new Float32Array(count * 2 * 3);
  const links = new BufferGeometry();
  links.setAttribute('position', new BufferAttribute(linkPositions, 3));
  const linkLines = new LineSegments(
    links,
    new LineBasicMaterial({ color: LINK_COLOR, transparent: true, opacity: 0.5 }),
  );
  group.add(linkLines);

  return {
    group,
    update: (flock, params) => {
      const self = flock[0];
      if (!self) {
        return;
      }
      const radii = [params.separationRadius, params.alignmentRadius, params.cohesionRadius];
      rings.forEach((ring, i) => {
        ring.position.set(self.position.x, self.position.y, 1);
        ring.scale.setScalar(radii[i]);
      });

      const farthest = Math.max(...radii);
      let lines = 0;
      for (const other of flock) {
        const dx = other.position.x - self.position.x;
        const dy = other.position.y - self.position.y;
        if (other === self || Math.hypot(dx, dy) > farthest) {
          continue;
        }
        linkPositions.set(
          [self.position.x, self.position.y, 1, other.position.x, other.position.y, 1],
          lines * 6,
        );
        lines++;
      }
      links.setDrawRange(0, lines * 2);
      links.attributes.position.needsUpdate = true;
    },
    dispose: () => {
      circle.dispose();
      links.dispose();
      for (const ring of rings) {
        ring.material.dispose();
      }
      linkLines.material.dispose();
    },
  };
}
