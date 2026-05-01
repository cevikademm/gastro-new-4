import type React from 'react';
import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

/**
 * 21st.dev tarzı interaktif tool kartı.
 * - Mouse takipli spotlight (radial gradient)
 * - 3D tilt (perspective + rotateX/Y)
 * - Animated gradient border beam (döner ışık)
 */
interface ToolCardProps {
  index: number;
  gradient: string;      // tailwind gradient classes (from-... via-... to-...)
  glowColor: string;     // rgba spotlight color
  delay?: number;
  children: ReactNode;
}

export default function ToolCard({ index, gradient, glowColor, delay = 0, children }: ToolCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Mouse pozisyonu (-0.5 .. 0.5)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Spring ile yumuşatılmış değerler
  const sx = useSpring(mx, { stiffness: 200, damping: 20, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 200, damping: 20, mass: 0.5 });

  // Tilt (±6 derece)
  const rotateX = useTransform(sy, (v) => -v * 6);
  const rotateY = useTransform(sx, (v) => v * 6);

  // Spotlight pozisyonu (px cinsinden kart içi koordinat)
  const spotX = useMotionValue(-200);
  const spotY = useMotionValue(-200);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    spotX.set(px);
    spotY.set(py);
    mx.set(px / rect.width - 0.5);
    my.set(py / rect.height - 0.5);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
    spotX.set(-200);
    spotY.set(-200);
  };

  const background = useTransform(
    [spotX, spotY],
    ([x, y]) => `radial-gradient(260px circle at ${x}px ${y}px, ${glowColor}, transparent 70%)`
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className="group relative will-change-transform"
    >
      {/* Animated rotating gradient border — 21st.dev border beam */}
      <div className="absolute -inset-[1px] rounded-[28px] overflow-hidden pointer-events-none">
        <div
          className={`absolute -inset-1 rounded-[28px] bg-gradient-to-br ${gradient} opacity-40 group-hover:opacity-100 blur-[2px] group-hover:blur-0 transition-all duration-500`}
        />
        {/* Conic rotating beam */}
        <div
          className="absolute -inset-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[spin_6s_linear_infinite]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${glowColor} 60deg, transparent 120deg, transparent 360deg)`,
          }}
        />
      </div>

      <div
        ref={ref}
        className="relative h-full rounded-[27px] bg-[#0a0a0a] border border-white/[0.06] p-7 overflow-hidden flex flex-col"
      >
        {/* Mouse spotlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background }}
        />

        {/* Grid pattern bg */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Big number */}
        <div className="absolute top-5 right-6 text-[72px] font-black leading-none text-white/[0.04] select-none pointer-events-none">
          0{index + 1}
        </div>

        <div className="relative z-10 flex-1 flex flex-col" style={{ transform: 'translateZ(40px)' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
