// Draws the block crows straight from the flock buffer that core/boids3d.wgsl writes.
// One instance = one crow. The vertex shader turns the crow to face its velocity and flaps its wings,
// so the CPU never touches the flock.

struct Boid {
  position: vec3f,
  velocity: vec3f,
}

struct Camera {
  viewProjection: mat4x4f,
  /** Direction toward the sun (normalized) */
  sun: vec3f,
  /** Seconds the flock has flown, for the wings */
  time: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> boids: array<Boid>;

/** Flaps per second, and how far a wing swings (radians). Same as the 3D screen */
const FLAPS = 3.0;
const FLAP_ANGLE = 0.6;
/** Where the left wing joins the body. The right wing is the mirror */
const SHOULDER = vec3f(0.4, 0.2, 0.1);

struct VertexIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) color: vec3f,
  /** 0 = body, +1 = left wing, −1 = right wing */
  @location(3) part: f32,
}

struct VertexOut {
  @builtin(position) clip: vec4f,
  @location(0) color: vec3f,
  @location(1) normal: vec3f,
}

/** Turns v around the forward (z) axis */
fn rotateZ(v: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(v.x * c - v.y * s, v.x * s + v.y * c, v.z);
}

@vertex
fn vs(v: VertexIn, @builtin(instance_index) i: u32) -> VertexOut {
  let boid = boids[i];

  // Wings swing around their shoulder. Each crow starts at a different point in its flap,
  // taken from its number, so the flock doesn't flap all at once
  var local = v.position;
  var normal = v.normal;
  if (v.part != 0.0) {
    let offset = fract(f32(i) * 0.618034);
    let angle = sin((offset + camera.time * FLAPS) * 6.283185) * FLAP_ANGLE * v.part;
    let shoulder = vec3f(SHOULDER.x * v.part, SHOULDER.y, SHOULDER.z);
    local = shoulder + rotateZ(local - shoulder, angle);
    normal = rotateZ(normal, angle);
  }

  // Face the way it flies: local +z goes along the velocity, local +y stays as close to up as it can
  let forward = normalize(boid.velocity);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);
  let world = boid.position + right * local.x + up * local.y + forward * local.z;

  var out: VertexOut;
  out.clip = camera.viewProjection * vec4f(world, 1.0);
  out.color = v.color;
  out.normal = right * normal.x + up * normal.y + forward * normal.z;
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  // Light from the sun plus some from all around, so the dark crows still show their shape
  let light = 0.55 + 0.6 * max(dot(normalize(in.normal), camera.sun), 0.0);
  return vec4f(in.color * light, 1.0);
}
