import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Lusion / Oryzo-inspired cinematic hero background.
 * - Full-bleed shader plane with brand-color flow noise & grain
 * - Floating glass spheres, torus knots, and rounded boxes (instanced + MeshPhysicalMaterial)
 * - Mouse parallax + slow camera drift
 * - DPR-capped, pauses when offscreen, respects prefers-reduced-motion
 */
export default function CinematicHeroBackground({
  className = '',
  intensity = 1,
}: { className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = container.clientWidth || window.innerWidth;
    let h = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    });

    // ─── Shader background plane ─────────────────────────────────────────────
    const bgUniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(w, h) },
      uColorA: { value: new THREE.Color('#0F2440') }, // navy ink
      uColorB: { value: new THREE.Color('#1E3A5F') }, // navy
      uColorC: { value: new THREE.Color('#E85D26') }, // clay
      uColorD: { value: new THREE.Color('#FF7A45') }, // clay-soft
      uIntensity: { value: intensity },
    };

    const bgGeo = new THREE.PlaneGeometry(2, 2);
    const bgMat = new THREE.ShaderMaterial({
      uniforms: bgUniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2  uMouse;
        uniform vec2  uResolution;
        uniform vec3  uColorA;
        uniform vec3  uColorB;
        uniform vec3  uColorC;
        uniform vec3  uColorD;
        uniform float uIntensity;

        // Simplex 2D noise — Ashima
        vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        float snoise(vec2 v){
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x>x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                  + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                  dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 hh = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + hh*hh);
          vec3 g;
          g.x  = a0.x  * x0.x  + hh.x  * x0.y;
          g.yz = a0.yz * x12.xz + hh.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        float fbm(vec2 p){
          float v = 0.0; float a = 0.5;
          for (int i=0;i<5;i++){ v += a*snoise(p); p *= 2.02; a *= 0.5; }
          return v;
        }

        // tiny hash for grain
        float hash21(vec2 p){
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);

          float t = uTime * 0.06;
          vec2 q = vec2(
            fbm(p * 1.4 + vec2(0.0, t)),
            fbm(p * 1.4 + vec2(1.7, -t))
          );
          vec2 r = vec2(
            fbm(p * 2.1 + 1.4*q + vec2(1.7,9.2) + 0.15*t),
            fbm(p * 2.1 + 1.4*q + vec2(8.3,2.8) - 0.13*t)
          );
          float n = fbm(p * 2.0 + 1.6*r);

          // deep navy base, two color flares (clay) drifting
          vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, n + 0.3));

          float d1 = length(p - vec2(-0.45 + 0.18*sin(t*2.0), 0.10 + 0.12*cos(t*1.6)));
          float d2 = length(p - vec2( 0.55 + 0.15*cos(t*1.4), -0.18 + 0.10*sin(t*2.2)));
          float flare1 = smoothstep(0.95, 0.0, d1) * 0.9;
          float flare2 = smoothstep(0.85, 0.0, d2) * 0.7;

          col = mix(col, uColorC, flare1 * (0.55 + 0.45*n) * uIntensity);
          col = mix(col, uColorD, flare2 * (0.45 + 0.45*n) * uIntensity);

          // subtle mouse light
          vec2 mp = (uMouse - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
          float md = length(p - mp);
          col += uColorD * smoothstep(0.55, 0.0, md) * 0.10 * uIntensity;

          // vignette
          float vig = smoothstep(1.15, 0.25, length(p));
          col *= mix(0.55, 1.0, vig);

          // film grain
          float g = (hash21(gl_FragCoord.xy + uTime) - 0.5) * 0.045;
          col += g;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.frustumCulled = false;
    scene.add(bgMesh);

    // ─── Lights ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffd5b4, 1.6);
    key.position.set(6, 5, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6088ff, 1.1);
    rim.position.set(-7, -3, -5);
    scene.add(rim);
    const accent = new THREE.PointLight(0xe85d26, 1.6, 26);
    accent.position.set(0, 0, 5);
    scene.add(accent);

    // ─── Floating premium objects ────────────────────────────────────────────
    const objects: { mesh: THREE.Mesh; baseY: number; speed: number; spin: THREE.Vector3 }[] = [];

    const physical = (color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.85,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.2,
        ...opts,
      });

    const glass = () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.05,
        transmission: 0.95,
        thickness: 1.1,
        ior: 1.45,
        attenuationColor: new THREE.Color('#cfe1ff'),
        attenuationDistance: 2.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.4,
        transparent: true,
      });

    const add = (mesh: THREE.Mesh, x: number, y: number, z: number, scale = 1) => {
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(mesh);
      objects.push({
        mesh,
        baseY: y,
        speed: 0.5 + Math.random() * 0.6,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2,
        ),
      });
      return mesh;
    };

    // Hero pieces — placed off the central content area
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), physical(0xe85d26)), -4.2, 1.6, -1.0, 1.0);
    add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.15, 96, 16), physical(0xff7a45, { roughness: 0.25 })), 4.6, 1.2, -1.5, 0.9);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), glass()), 4.0, -1.6, 0.4, 1.1);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 48), glass()), -3.6, -1.9, -0.5, 0.9);
    add(new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), physical(0x2d5a8e, { metalness: 0.95, roughness: 0.12 })), -5.0, -0.5, -2.2, 1.0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.13, 24, 96), physical(0xffd089, { metalness: 0.95, roughness: 0.18 })), 5.2, -0.2, -2.0, 1.0);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), physical(0xe85d26)), 2.6, 2.4, -3.0, 1.0);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.30, 0), physical(0x6088ff, { metalness: 0.6 })), -2.4, -2.6, -2.6, 1.0);

    // ─── Particles dust ──────────────────────────────────────────────────────
    const PCOUNT = reduceMotion ? 240 : 600;
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i*3+0] = (Math.random() - 0.5) * 20;
      pPos[i*3+1] = (Math.random() - 0.5) * 12;
      pPos[i*3+2] = (Math.random() - 0.5) * 10 - 2;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffd0b0,
      size: 0.025,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // ─── Mouse parallax ──────────────────────────────────────────────────────
    const mouse = new THREE.Vector2(0.5, 0.5);
    const target = new THREE.Vector2(0, 0);
    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
      target.x = (mouse.x - 0.5) * 2;
      target.y = (mouse.y - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    // ─── Animate ─────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (visible = e.isIntersecting)),
      { threshold: 0.01 },
    );
    io.observe(container);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      bgUniforms.uTime.value = t;
      bgUniforms.uMouse.value.set(mouse.x, mouse.y);

      // Smooth camera parallax
      camera.position.x += (target.x * 0.7 - camera.position.x) * 0.04;
      camera.position.y += (target.y * 0.5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Float / spin objects
      const slow = reduceMotion ? 0.2 : 1.0;
      objects.forEach((o) => {
        o.mesh.position.y = o.baseY + Math.sin(t * o.speed) * 0.25;
        o.mesh.rotation.x += o.spin.x * 0.01 * slow;
        o.mesh.rotation.y += o.spin.y * 0.01 * slow;
        o.mesh.rotation.z += o.spin.z * 0.01 * slow;
      });

      points.rotation.y = t * 0.02;
      points.rotation.x = Math.sin(t * 0.15) * 0.05;

      renderer.render(scene, camera);
    };
    tick();

    // ─── Resize ──────────────────────────────────────────────────────────────
    const onResize = () => {
      w = container.clientWidth || window.innerWidth;
      h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      bgUniforms.uResolution.value.set(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      bgGeo.dispose();
      bgMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      objects.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [intensity]);

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
