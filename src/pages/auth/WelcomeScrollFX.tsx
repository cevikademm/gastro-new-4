import { motion, useScroll, useSpring, useTransform, useReducedMotion } from 'motion/react';

// Hyper palette — iridescent accents over near-black canvas
const BRAND_BLUE = '#E85D26';       // clay (primary accent)
const BRAND_BLUE_DEEP = '#7B8BFF';  // iridescent violet-blue (chromatic highlight)
const BRAND_AMBER = '#D4A574';      // warm tan (secondary warm)

export default function WelcomeScrollFX() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 25, mass: 0.5 });

  const orb1Y = useTransform(smooth, [0, 1], ['0vh', '-55vh']);
  const orb1X = useTransform(smooth, [0, 1], ['0vw', '12vw']);
  const orb2Y = useTransform(smooth, [0, 1], ['0vh', '70vh']);
  const orb2X = useTransform(smooth, [0, 1], ['0vw', '-10vw']);
  const orb3Y = useTransform(smooth, [0, 1], ['0vh', '-90vh']);
  const orb4Y = useTransform(smooth, [0, 1], ['0vh', '45vh']);

  const rot1 = useTransform(smooth, [0, 1], [0, 540]);
  const rot2 = useTransform(smooth, [0, 1], [0, -360]);
  const rot3 = useTransform(smooth, [0, 1], [0, 720]);

  const gridY = useTransform(smooth, [0, 1], [0, -220]);
  const lineScale = useTransform(smooth, [0, 1], [0.2, 1.6]);

  const progressPct = useTransform(smooth, (v) => `${Math.round(v * 100)}`);

  if (prefersReduced) {
    return (
      <div aria-hidden className="pointer-events-none">
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: 60,
            background: `linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_AMBER})`,
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Top scroll progress bar */}
      <motion.div
        aria-hidden
        style={{
          scaleX: smooth,
          transformOrigin: 'left',
          background: `linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_AMBER}, ${BRAND_BLUE_DEEP})`,
        }}
        className="pointer-events-none fixed top-0 left-0 right-0 h-[3px] z-[60]"
      />

      {/* Scroll-depth chip (bottom right, Claude-style editorial) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed bottom-5 right-5 z-[60] hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
        style={{
          background: 'rgba(20,20,20,0.72)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 10px 30px -12px rgba(0,0,0,0.6)',
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: BRAND_AMBER, boxShadow: `0 0 10px ${BRAND_AMBER}` }}
        />
        <span
          className="text-[10px] font-mono uppercase tracking-[0.22em]"
          style={{ color: 'rgba(255,255,255,0.72)' }}
        >
          Scroll
        </span>
        <motion.span
          className="text-[11px] font-semibold tabular-nums"
          style={{ color: BRAND_BLUE }}
        >
          {progressPct}
        </motion.span>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
          %
        </span>
      </motion.div>

      {/* Main decorative layer — fixed to viewport, behind nav/modals */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      >
        {/* Subtle dot grid with parallax */}
        <motion.svg
          style={{ y: gridY }}
          className="absolute inset-0 w-full h-[140vh]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="welcomeFXDots"
              x="0"
              y="0"
              width="44"
              height="44"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.1" fill="#ffffff" opacity="0.06" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#welcomeFXDots)" />
        </motion.svg>

        {/* Vertical editorial accent lines (left & right edges) */}
        <motion.div
          style={{ scaleY: lineScale, transformOrigin: 'top' }}
          className="absolute top-0 left-4 sm:left-10 w-px h-[60vh]"
          aria-hidden
        >
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(to bottom, transparent, ${BRAND_BLUE}55, transparent)`,
            }}
          />
        </motion.div>
        <motion.div
          style={{ scaleY: lineScale, transformOrigin: 'top' }}
          className="absolute top-0 right-4 sm:right-10 w-px h-[60vh]"
          aria-hidden
        >
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(to bottom, transparent, ${BRAND_AMBER}66, transparent)`,
            }}
          />
        </motion.div>

        {/* Floating color orbs — mix-blend-multiply so text beneath stays legible */}
        <motion.div
          style={{
            y: orb1Y,
            x: orb1X,
            background: `radial-gradient(circle at center, ${BRAND_BLUE}cc, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
          className="absolute top-[6%] -left-[12%] w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
        />
        <motion.div
          style={{
            y: orb2Y,
            x: orb2X,
            background: `radial-gradient(circle at center, ${BRAND_AMBER}e0, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
          className="absolute top-[38%] -right-[12%] w-[460px] h-[460px] rounded-full blur-3xl opacity-35"
        />
        <motion.div
          style={{
            y: orb3Y,
            background: `radial-gradient(circle at center, ${BRAND_BLUE_DEEP}aa, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
          className="absolute top-[72%] left-[20%] w-[380px] h-[380px] rounded-full blur-3xl opacity-30"
        />
        <motion.div
          style={{
            y: orb4Y,
            background: `radial-gradient(circle at center, ${BRAND_BLUE}90, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
          className="absolute top-[92%] right-[25%] w-[340px] h-[340px] rounded-full blur-3xl opacity-30"
        />

        {/* Rotating geometric shapes — restrained, editorial */}
        <motion.svg
          style={{ rotate: rot1 }}
          className="absolute top-[22%] right-[8%] w-14 h-14 opacity-40"
          viewBox="0 0 40 40"
        >
          <polygon
            points="20,4 36,34 4,34"
            fill="none"
            stroke={BRAND_BLUE}
            strokeWidth="1.4"
          />
        </motion.svg>

        <motion.svg
          style={{ rotate: rot2 }}
          className="absolute top-[48%] left-[5%] w-12 h-12 opacity-50"
          viewBox="0 0 40 40"
        >
          <rect
            x="4"
            y="4"
            width="32"
            height="32"
            fill="none"
            stroke={BRAND_AMBER}
            strokeWidth="1.4"
          />
        </motion.svg>

        <motion.svg
          style={{ rotate: rot3 }}
          className="absolute top-[74%] right-[14%] w-11 h-11 opacity-45"
          viewBox="0 0 40 40"
        >
          <polygon
            points="20,4 36,20 20,36 4,20"
            fill="none"
            stroke={BRAND_BLUE_DEEP}
            strokeWidth="1.4"
          />
        </motion.svg>

        <motion.svg
          style={{ rotate: rot1 }}
          className="absolute top-[34%] left-[10%] w-9 h-9 opacity-50"
          viewBox="0 0 40 40"
        >
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={BRAND_BLUE}
            strokeWidth="1.4"
            strokeDasharray="3 4"
          />
        </motion.svg>

        <motion.svg
          style={{ rotate: rot2 }}
          className="absolute top-[86%] left-[48%] w-11 h-11 opacity-40"
          viewBox="0 0 40 40"
        >
          <polygon
            points="20,4 36,34 4,34"
            fill="none"
            stroke={BRAND_AMBER}
            strokeWidth="1.4"
          />
        </motion.svg>

        <motion.svg
          style={{ rotate: rot3 }}
          className="absolute top-[14%] left-[42%] w-9 h-9 opacity-35"
          viewBox="0 0 40 40"
        >
          <rect
            x="4"
            y="4"
            width="32"
            height="32"
            fill="none"
            stroke={BRAND_BLUE}
            strokeWidth="1.4"
          />
        </motion.svg>

        <motion.svg
          style={{ rotate: rot2 }}
          className="absolute top-[58%] right-[30%] w-8 h-8 opacity-40"
          viewBox="0 0 40 40"
        >
          <circle
            cx="20"
            cy="20"
            r="14"
            fill="none"
            stroke={BRAND_AMBER}
            strokeWidth="1.4"
          />
        </motion.svg>
      </div>
    </>
  );
}
