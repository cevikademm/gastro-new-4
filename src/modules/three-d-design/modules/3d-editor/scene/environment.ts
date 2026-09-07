/**
 * Image-based lighting for the editor scene.
 *
 * A PMREM-filtered `RoomEnvironment` gives stainless steel real reflections
 * (without it, metalness just turns things grey). No HDR download — the
 * environment is generated on the GPU in a few ms.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let cached: { renderer: THREE.WebGLRenderer; texture: THREE.Texture } | null = null;

/** Apply a room environment to `scene`; safe to call repeatedly. */
export function installRoomEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.6): void {
  if (!cached || cached.renderer !== renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const env = new RoomEnvironment();
    const texture = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    cached = { renderer, texture };
  }
  scene.environment = cached.texture;
  scene.environmentIntensity = intensity;
}

export function removeRoomEnvironment(scene: THREE.Scene): void {
  scene.environment = null;
}
