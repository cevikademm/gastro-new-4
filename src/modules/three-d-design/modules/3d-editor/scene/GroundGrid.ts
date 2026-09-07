/**
 * GroundGrid — anti-aliased, distance-faded reference grid (0.5 m minor,
 * 1 m major, coloured X/Z axes) drawn as ONE shader plane.
 *
 * Why not GridHelper? Its 100 × 100 line segments run to the horizon as a hard
 * converging band, alias badly when viewed at grazing angles and never fade,
 * so the scene looks like a spreadsheet. This plane computes the lines in the
 * fragment shader with `fwidth`-based anti-aliasing and fades them out with
 * distance from the camera, the way Blender / Shapr3D / Spline draw theirs.
 *
 * Also exports a shadow-catcher plane so equipment standing outside a room
 * still casts a soft contact shadow on the "ground".
 */

import * as THREE from 'three';

export interface GroundGridOptions {
  /** Plane edge length in metres (default 400 — well beyond any kitchen). */
  size?: number;
  minorStep?: number;
  majorStep?: number;
  /** Fade starts / ends this many metres from the camera (XZ distance). */
  fadeStart?: number;
  fadeEnd?: number;
  minorColor?: number;
  majorColor?: number;
  axisXColor?: number;
  axisZColor?: number;
}

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform float uMinor;
  uniform float uMajor;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uOpacity;
  uniform vec3 uMinorColor;
  uniform vec3 uMajorColor;
  uniform vec3 uAxisX;
  uniform vec3 uAxisZ;
  varying vec3 vWorld;

  // Coverage of the nearest grid line (in screen pixels) for a given step.
  float lineCoverage(vec2 p, float step, float halfWidthPx) {
    vec2 coord = p / step;
    vec2 d = fwidth(coord);
    vec2 g = abs(fract(coord - 0.5) - 0.5) / max(d, vec2(1e-5));
    float dist = min(g.x, g.y);
    return 1.0 - smoothstep(halfWidthPx, halfWidthPx + 1.0, dist);
  }

  void main() {
    vec2 p = vWorld.xz;
    vec2 dpx = fwidth(p);

    // Minor lines vanish when they would be denser than ~6 px on screen.
    float minorPx = uMinor / max(max(dpx.x, dpx.y), 1e-5);
    float minorVis = smoothstep(6.0, 14.0, minorPx);

    float minor = lineCoverage(p, uMinor, 0.5) * minorVis;
    float major = lineCoverage(p, uMajor, 0.7);

    float ax = 1.0 - smoothstep(0.9, 1.9, abs(p.y) / max(dpx.y, 1e-5)); // X axis (z = 0)
    float az = 1.0 - smoothstep(0.9, 1.9, abs(p.x) / max(dpx.x, 1e-5)); // Z axis (x = 0)

    vec3 col = uMinorColor;
    float a = minor * 0.35;
    col = mix(col, uMajorColor, major);
    a = max(a, major * 0.7);
    col = mix(col, uAxisX, ax);
    a = max(a, ax * 0.8);
    col = mix(col, uAxisZ, az);
    a = max(a, az * 0.8);

    // Fade with distance from the camera's ground point; the minor grid
    // disappears sooner than the major one so far ground stays calm.
    float dist = distance(p, cameraPosition.xz);
    float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
    float fadeMinor = 1.0 - smoothstep(uFadeStart * 0.5, uFadeEnd * 0.6, dist);
    a *= mix(fadeMinor, fade, max(major, max(ax, az))) * uOpacity;
    if (a < 0.004) discard;

    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

export function createGroundGrid(opts: GroundGridOptions = {}): THREE.Mesh {
  const {
    size = 400,
    minorStep = 0.5,
    majorStep = 1,
    fadeStart = 7,
    fadeEnd = 34,
    minorColor = 0xdde2e8,
    majorColor = 0xc3cad4,
    axisXColor = 0xecb3b6,
    axisZColor = 0xb3cde8,
  } = opts;

  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMinor: { value: minorStep },
      uMajor: { value: majorStep },
      uFadeStart: { value: fadeStart },
      uFadeEnd: { value: fadeEnd },
      uOpacity: { value: 1 },
      uMinorColor: { value: new THREE.Color(minorColor) },
      uMajorColor: { value: new THREE.Color(majorColor) },
      uAxisX: { value: new THREE.Color(axisXColor) },
      uAxisZ: { value: new THREE.Color(axisZColor) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  material.userData.shared = true;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ground-grid';
  mesh.rotation.x = -Math.PI / 2;
  // A hair below y = 0 so room floors occlude it instead of z-fighting.
  mesh.position.y = -0.002;
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return mesh;
}

/** Invisible plane that only shows the shadows falling on it. */
export function createShadowCatcher(size = 400, opacity = 0.16): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.ShadowMaterial({ opacity, transparent: true, depthWrite: false });
  material.userData.shared = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'shadow-catcher';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.001;
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return mesh;
}

/**
 * Vertical gradient background texture (top → bottom). Rendered by Three as a
 * full-viewport quad; survives `capture()` so saved renders keep the sweep.
 */
export function createGradientBackground(top: string, bottom: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.userData.shared = true;
  return tex;
}
