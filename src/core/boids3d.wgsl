// The 3D Boids for the GPU (WebGPU compute shader). Same rules as core/boids3d.ts, in the same order.
//
// On the CPU, step() moves the crows one after another. Here one GPU thread moves one crow,
// and thousands of threads run at the same time. Each rule is still "look at every other crow" (N²):
// the work is the same, but it is split across the GPU.
// All crows move at once, so it reads the old flock (boidsIn) and writes the new one (boidsOut).

/** One crow. Only a position and a velocity (world units per second) */
struct Boid {
  position: vec3f,
  velocity: vec3f,
}

/** The same numbers as Params in core/params.ts, plus what step() gets as arguments */
struct Params {
  count: u32,
  dt: f32,
  separationRadius: f32,
  alignmentRadius: f32,
  cohesionRadius: f32,
  separationWeight: f32,
  alignmentWeight: f32,
  cohesionWeight: f32,
  minSpeed: f32,
  maxSpeed: f32,
  avoidWallWeight: f32,
  /** Size of the area, a box centered at (0, 0, 0) */
  area: vec3f,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> boidsIn: array<Boid>;
@group(0) @binding(2) var<storage, read_write> boidsOut: array<Boid>;

// ---- The three rules ----
// Each one looks at the other crows near crow `i` and returns one force.
// `self` is a reserved word in WGSL, so the crow that moves is called `me`.

/** Separation: move away from crows that are too close. Closer crows push harder (1 / distance) */
fn separation(i: u32, radius: f32) -> vec3f {
  let me = boidsIn[i];
  var sum = vec3f(0.0);
  var count = 0.0;
  for (var j = 0u; j < params.count; j++) {
    let away = me.position - boidsIn[j].position;
    let distance = length(away);
    if (j == i || distance == 0.0 || distance > radius) {
      continue;
    }
    sum += away / (distance * distance);
    count += 1.0;
  }
  if (count == 0.0) {
    return vec3f(0.0);
  }
  return sum / count;
}

/** Alignment: fly the same way as the crows nearby. Their average velocity minus mine */
fn alignment(i: u32, radius: f32) -> vec3f {
  let me = boidsIn[i];
  var sum = vec3f(0.0);
  var count = 0.0;
  for (var j = 0u; j < params.count; j++) {
    let distance = length(me.position - boidsIn[j].position);
    if (j == i || distance > radius) {
      continue;
    }
    sum += boidsIn[j].velocity;
    count += 1.0;
  }
  if (count == 0.0) {
    return vec3f(0.0);
  }
  let average = sum / count;
  return average - me.velocity;
}

/** Cohesion: move toward the center of the crows nearby. Their average position minus mine */
fn cohesion(i: u32, radius: f32) -> vec3f {
  let me = boidsIn[i];
  var sum = vec3f(0.0);
  var count = 0.0;
  for (var j = 0u; j < params.count; j++) {
    let distance = length(me.position - boidsIn[j].position);
    if (j == i || distance > radius) {
      continue;
    }
    sum += boidsIn[j].position;
    count += 1.0;
  }
  if (count == 0.0) {
    return vec3f(0.0);
  }
  let center = sum / count;
  return center - me.position;
}

/** Steering force: the three rules, each times its weight, added up */
fn steer(i: u32) -> vec3f {
  let s = separation(i, params.separationRadius) * params.separationWeight;
  let a = alignment(i, params.alignmentRadius) * params.alignmentWeight;
  let c = cohesion(i, params.cohesionRadius) * params.cohesionWeight;
  return s + a + c;
}

// ---- Extra force ----

/** Pushes the crow back when it is outside the area: +1 past the low side, −1 past the high side, on each axis */
fn avoidWalls(position: vec3f) -> vec3f {
  let half = params.area * 0.5;
  let low = select(vec3f(0.0), vec3f(1.0), position < -half);
  let high = select(vec3f(0.0), vec3f(1.0), position > half);
  return low - high;
}

/** Keeps the length of v between min and max, without changing its direction */
fn clampLength(v: vec3f, min: f32, max: f32) -> vec3f {
  let len = length(v);
  if (len == 0.0) {
    return v;
  }
  return v * (clamp(len, min, max) / len);
}

// ---- One step ----

/**
 * Moves crow number id.x one step. Same order as step() in core/boids3d.ts:
 * steering force → push back from walls → velocity += force × dt → limit the speed → position += velocity × dt
 */
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  // Threads come in groups of 64, so the last group may have more threads than crows
  if (i >= params.count) {
    return;
  }
  let me = boidsIn[i];
  var force = steer(i);
  force += avoidWalls(me.position) * params.avoidWallWeight;

  let velocity = clampLength(me.velocity + force * params.dt, params.minSpeed, params.maxSpeed);
  let position = me.position + velocity * params.dt;
  boidsOut[i] = Boid(position, velocity);
}
