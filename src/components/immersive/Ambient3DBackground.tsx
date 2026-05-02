import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Variant = 'navy' | 'clay' | 'mono';

interface Props {
  className?: string;
  variant?: Variant;
  density?: number;       // 0..1, scales object/particle count
  intensity?: number;     // shader intensity
  scrollReactive?: boolean;
  interactive?: boolean;  // mouse parallax
  style?: React.CSSProperties;
}

const PALETTES: Record<Variant, { a: string; b: string; c: string; d: string; obj: number[] }> = {
  navy: {
    a: '#06101e',
    b: '#0F2440',
    c: '#1E3A5F',
    d: '#E85D26',
    obj: [0xe85d26, 0xff7a45, 0x2d5a8e, 0x6088ff, 0xffd089, 0xffffff],
  },
  clay: {
    a: '#7a2c0f',
    b: '#C44A1A',
    c: '#E85D26',
    d: '#FFD089',
    obj: [0xffffff, 0xffd089, 0xfff5e6, 0xffb27a, 0x6088ff, 0x2d5a8e],
  },
  mono: {
    a: '#0a0a0c',
    b: '#15151a',
    c: '#26262d',
    d: '#3a3a45',
    obj: [0xffffff, 0xcccccc, 0x6088ff, 0xe85d26, 0xffd089, 0x2d5a8e],
  },
};

/**
 * Lusion / Lab / Lando-inspired ambient WebGL backdrop.
 * - Full-bleed nebula shader (FBM noise + drifting flares + grain)
 * - Floating glass + metallic primitives, slow spin & bob
 * - Optional scroll-reactive camera drift
 * - DPR-capped, IntersectionObserver pause, prefers-reduced-motion aware
 * - Mobile: auto-reduces counts; pointerEvents none → never blocks UI
 */
export default function Ambient3DBackground({
  className = '',
  variant = 'navy',
  density = 1,
  intensity = 1,
  scrollReactive = true,
  interactive = true,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const [hasActivated, setHasActivated] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasActivated(true);
      },
      { rootMargin: '1000px' }
    );
    io.observe(container);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!hasActivated) return;

    const container = ref.current;
    if (!container) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia?.('(max-width: 640px)').matches;
    const palette = PALETTES[variant];
    const scale = density * (isMobile ? 0.55 : 1);

    let w = container.clientWidth || window.innerWidth;
    let h = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
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

    // ── Nebula shader plane ────────────────────────────────────────────────
    const uni = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(w, h) },
      uA: { value: new THREE.Color(palette.a) },
      uB: { value: new THREE.Color(palette.b) },
      uC: { value: new THREE.Color(palette.c) },
      uD: { value: new THREE.Color(palette.d) },
      uIntensity: { value: intensity },
    };
    const bgMat = new THREE.ShaderMaterial({
      uniforms: uni,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime; uniform vec2 uMouse; uniform vec2 uRes;
        uniform vec3 uA, uB, uC, uD; uniform float uIntensity;
        vec3 perm(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
        float snoise(vec2 v){
          const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);
          vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
          vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
          vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.);
          vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
          vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
          m=m*m; m=m*m;
          vec3 x=2.*fract(p*C.www)-1.; vec3 hh=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox;
          m*=1.79284291-.85373472*(a0*a0+hh*hh);
          vec3 g; g.x=a0.x*x0.x+hh.x*x0.y; g.yz=a0.yz*x12.xz+hh.yz*x12.yw;
          return 130.*dot(m,g);
        }
        float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.02;a*=.5;} return v;}
        float h21(vec2 p){p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y);}
        void main(){
          vec2 uv=vUv; vec2 p=(uv-.5)*vec2(uRes.x/uRes.y,1.);
          float t=uTime*.06;
          vec2 q=vec2(fbm(p*1.4+vec2(0,t)), fbm(p*1.4+vec2(1.7,-t)));
          vec2 r=vec2(fbm(p*2.1+1.4*q+vec2(1.7,9.2)+.15*t), fbm(p*2.1+1.4*q+vec2(8.3,2.8)-.13*t));
          float n=fbm(p*2.0+1.6*r);
          vec3 col=mix(uA,uB,smoothstep(0.,1.,n+.3));
          float d1=length(p-vec2(-.45+.18*sin(t*2.),.10+.12*cos(t*1.6)));
          float d2=length(p-vec2( .55+.15*cos(t*1.4),-.18+.10*sin(t*2.2)));
          col=mix(col,uC,smoothstep(.95,0.,d1)*.85*(.55+.45*n)*uIntensity);
          col=mix(col,uD,smoothstep(.85,0.,d2)*.65*(.45+.45*n)*uIntensity);
          vec2 mp=(uMouse-.5)*vec2(uRes.x/uRes.y,1.);
          col+=uD*smoothstep(.55,0.,length(p-mp))*.10*uIntensity;
          float vig=smoothstep(1.15,.25,length(p)); col*=mix(.55,1.,vig);
          col+=(h21(gl_FragCoord.xy+uTime)-.5)*.04;
          gl_FragColor=vec4(col,1.);
        }`,
    });
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bgMesh.frustumCulled = false;
    scene.add(bgMesh);

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffd5b4, 1.5);
    key.position.set(6, 5, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6088ff, 1.0);
    rim.position.set(-7, -3, -5); scene.add(rim);
    const accent = new THREE.PointLight(0xe85d26, 1.4, 26);
    accent.position.set(0, 0, 5); scene.add(accent);

    // ── Floating objects ───────────────────────────────────────────────────
    const objects: { m: THREE.Mesh; baseY: number; speed: number; spin: THREE.Vector3 }[] = [];
    const physical = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({
        color, metalness: 0.8, roughness: 0.2,
        ...opts,
      });
    const glass = () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.05,
        transparent: true, opacity: 0.3
      });
    const geos = [
      () => new THREE.IcosahedronGeometry(0.5, 0),
      () => new THREE.TorusKnotGeometry(0.42, 0.13, 96, 16),
      () => new THREE.OctahedronGeometry(0.55, 0),
      () => new THREE.TorusGeometry(0.4, 0.13, 24, 96),
      () => new THREE.SphereGeometry(0.45, 36, 36),
    ];
    const N = Math.max(4, Math.round(8 * scale));
    for (let i = 0; i < N; i++) {
      const useGlass = Math.random() < 0.35;
      const color = palette.obj[i % palette.obj.length];
      const mat = useGlass ? glass() : physical(color, { roughness: 0.18 + Math.random() * 0.2 });
      const geo = geos[i % geos.length]();
      const m = new THREE.Mesh(geo, mat);
      const x = (Math.random() - 0.5) * 12;
      const y = (Math.random() - 0.5) * 6;
      const z = -1 - Math.random() * 4;
      m.position.set(x, y, z);
      m.scale.setScalar(0.7 + Math.random() * 0.7);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(m);
      objects.push({
        m, baseY: y, speed: 0.4 + Math.random() * 0.7,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2,
        ),
      });
    }

    // ── Particles dust ─────────────────────────────────────────────────────
    const PCOUNT = Math.round((reduceMotion ? 220 : 520) * scale);
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * 22;
      pPos[i*3+1] = (Math.random() - 0.5) * 14;
      pPos[i*3+2] = (Math.random() - 0.5) * 10 - 2;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: variant === 'mono' ? 0xffffff : 0xffd0b0,
      size: 0.026, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // ── Mouse parallax ─────────────────────────────────────────────────────
    const mouse = new THREE.Vector2(0.5, 0.5);
    const target = new THREE.Vector2(0, 0);
    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = 1 - (e.clientY - rect.top) / rect.height;
      target.x = (mouse.x - 0.5) * 2;
      target.y = (mouse.y - 0.5) * 2;
    };
    if (interactive) window.addEventListener('mousemove', onMove, { passive: true });

    // ── Scroll reactivity ──────────────────────────────────────────────────
    let scrollY = 0;
    const onScroll = () => {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // -1 (above viewport) … 0 (centered) … +1 (below)
      scrollY = (rect.top + rect.height / 2 - vh / 2) / vh;
    };
    if (scrollReactive) {
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // ── Animate ────────────────────────────────────────────────────────────
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
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();
      uni.uTime.value = t;
      uni.uMouse.value.set(mouse.x, mouse.y);

      const tx = target.x * 0.6;
      const ty = target.y * 0.4 - (scrollReactive ? scrollY * 0.6 : 0);
      camera.position.x += (tx - camera.position.x) * 0.04;
      camera.position.y += (ty - camera.position.y) * 0.04;
      camera.position.z = 9 + (scrollReactive ? scrollY * 0.8 : 0);
      camera.lookAt(0, 0, 0);

      const slow = reduceMotion ? 0.2 : 1.0;
      objects.forEach((o) => {
        o.m.position.y = o.baseY + Math.sin(t * o.speed) * 0.25;
        o.m.rotation.x += o.spin.x * 0.01 * slow;
        o.m.rotation.y += o.spin.y * 0.01 * slow;
        o.m.rotation.z += o.spin.z * 0.01 * slow;
      });
      points.rotation.y = t * 0.02;
      points.rotation.x = Math.sin(t * 0.15) * 0.05;

      renderer.render(scene, camera);
    };
    tick();

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      w = container.clientWidth || window.innerWidth;
      h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      uni.uRes.value.set(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (interactive) window.removeEventListener('mousemove', onMove);
      if (scrollReactive) window.removeEventListener('scroll', onScroll);
      
      // Deep cleanup
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [hasActivated, variant, density, intensity, scrollReactive, interactive]);

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
        ...style,
      }}
    />
  );
}
