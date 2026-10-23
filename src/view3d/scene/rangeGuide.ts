import {
  BufferAttribute,
  BufferGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  WireframeGeometry,
} from 'three';
import type { Boid } from '@/core/boids3d';
import type { Params } from '@/core/params';

/** How round the spheres are. Low, so the wireframe stays light and doesn't hide the crows */
const SPHERE_DETAIL = 2;
/** One color for each rule. The panel sliders use the same order: separation, alignment, cohesion */
const SEPARATION_COLOR = 0xd7263d;
const ALIGNMENT_COLOR = 0xf2a900;
const COHESION_COLOR = 0x1b6ca8;
/** Lines from the crow to the crows it sees */
const LINK_COLOR = 0x2b2d42;

/**
 * Shows how far one crow (the first in the flock) sees: a sphere for each rule's distance,
 * and a line to every crow inside the largest sphere. In 2D these are circles. For explaining only.
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

  // A sphere of radius 1. Each rule scales it to its own distance
  const sphere = new WireframeGeometry(new IcosahedronGeometry(1, SPHERE_DETAIL));
  const shells = [SEPARATION_COLOR, ALIGNMENT_COLOR, COHESION_COLOR].map((color) => {
    const shell = new LineSegments(
      sphere,
      new LineBasicMaterial({ color, transparent: true, opacity: 0.45 }),
    );
    group.add(shell);
    return shell;
  });

  const linkPositions = new Float32Array(count * 2 * 3);
  const links = new BufferGeometry();
  links.setAttribute('position', new BufferAttribute(linkPositions, 3));
  const linkLines = new LineSegments(links, new LineBasicMaterial({ color: LINK_COLOR }));
  group.add(linkLines);

  return {
    group,
    update: (flock, params) => {
      const self = flock[0];
      if (!self) {
        return;
      }
      const { x, y, z } = self.position;
      const radii = [params.separationRadius, params.alignmentRadius, params.cohesionRadius];
      shells.forEach((shell, i) => {
        shell.position.set(x, y, z);
        shell.scale.setScalar(radii[i]);
      });

      const farthest = Math.max(...radii);
      let lines = 0;
      for (const other of flock) {
        const o = other.position;
        if (other === self || Math.hypot(o.x - x, o.y - y, o.z - z) > farthest) {
          continue;
        }
        linkPositions.set([x, y, z, o.x, o.y, o.z], lines * 6);
        lines++;
      }
      links.setDrawRange(0, lines * 2);
      links.attributes.position.needsUpdate = true;
    },
    dispose: () => {
      sphere.dispose();
      links.dispose();
      for (const shell of shells) {
        shell.material.dispose();
      }
      linkLines.material.dispose();
    },
  };
}
