import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { Reveal } from '../primitives/Reveal';

export function FinalCTASection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-hidden c-noise py-24 md:py-32"
      style={{ background: 'linear-gradient(135deg, #E85D26 0%, #C44A1A 100%)' }}
    >
      {/* Decorative halo */}
      <motion.div
        className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-white/5 pointer-events-none"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-3xl mx-auto text-center px-4 relative z-10">
        <Reveal delay={0}>
          <h2 className="c-serif text-[2.6rem] md:text-[3.6rem] leading-[1.02] text-white font-medium">
            {t('landing.finalcta.heading')}{' '}
            <em className="text-white/70 italic">{t('landing.finalcta.accent')}</em>
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-white/80 text-base mt-4">
            {t('landing.finalcta.sub')}
          </p>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-[color:var(--c-clay)] hover:bg-white/90 shadow-lg rounded-full text-[15px] px-8 py-4 font-medium transition-all"
            >
              {t('landing.finalcta.register')}
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/rfq"
              className="inline-flex items-center justify-center gap-2 border border-white/50 text-white hover:bg-white/10 rounded-full text-[15px] px-8 py-4 font-medium transition-all"
            >
              <MessageSquare size={16} />
              {t('landing.finalcta.quote')}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
