import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
// @ts-ignore – AnimatePresence exists at runtime in motion v12
import { AnimatePresence } from 'motion/react';
import {
  ChefHat, Ruler, ClipboardList, Refrigerator,
  ArrowRight, ArrowLeft, Sparkles,
  ShieldCheck, BadgeCheck, Languages, Play
} from 'lucide-react';
import ThreeBackground from '../components/ThreeBackground';

const FEATURES = [
  { icon: Refrigerator, key: 'equipment' },
  { icon: Ruler, key: 'design' },
  { icon: ClipboardList, key: 'bom' },
  { icon: Sparkles, key: 'smart' },
];

const CATEGORIES = [
  { emoji: '❄️', nameKey: 'welcome.cat_cooling', count: 1775 },
  { emoji: '🔥', nameKey: 'welcome.cat_cooking', count: 1439 },
  { emoji: '🧹', nameKey: 'welcome.cat_prep', count: 615 },
  { emoji: '🍕', nameKey: 'welcome.cat_pizza', count: 401 },
  { emoji: '🍽️', nameKey: 'welcome.cat_selfservice', count: 499 },
  { emoji: '⚡', nameKey: 'welcome.cat_dynamic', count: 359 },
  { emoji: '🧊', nameKey: 'welcome.cat_icecream', count: 82 },
  { emoji: '☕', nameKey: 'welcome.cat_coffee', count: 95 },
];

export default function WelcomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const totalSteps = 4;

  const handleStart = () => {
    navigate('/login');
  };

  const nextStep = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const langs = ['tr','en','de','fr','nl','it','es','pt','pl','cs','ro','el','sv','da','hu'];
  const langFlag: Record<string, string> = {
    tr:'🇹🇷', en:'🇬🇧', de:'🇩🇪', fr:'🇫🇷', nl:'🇳🇱', it:'🇮🇹', es:'🇪🇸',
    pt:'🇵🇹', pl:'🇵🇱', cs:'🇨🇿', ro:'🇷🇴', el:'🇬🇷', sv:'🇸🇪', da:'🇩🇰', hu:'🇭🇺',
  };

  const cycleLang = () => {
    const current = langs.indexOf(i18n.language);
    const next = langs[(current + 1) % langs.length];
    i18n.changeLanguage(next);
    try { localStorage.setItem('2mc_lang', next); } catch {}
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden">
      {/* 3D Interactive Background */}
      <ThreeBackground />

      {/* Background pattern */}
      <div className="absolute inset-0 dot-grid pointer-events-none opacity-40 z-0" />

      {/* Decorative gradient blobs */}
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />

      {/* Language switcher */}
      <button
        onClick={cycleLang}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-highest/60 backdrop-blur text-on-surface-variant hover:text-primary transition-colors text-sm font-bold"
      >
        <span className="text-base leading-none">{langFlag[i18n.language] || '🇹🇷'}</span>
      </button>

      <div className="relative z-10 w-full max-w-lg px-6">
        <AnimatePresence mode="wait">
          {/* Step 0: Hero / Intro */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs font-bold text-primary tracking-[4px] uppercase mb-6 pb-3 border-b border-primary/20"
              >
                {t('welcome.tagline')}
              </motion.div>

              {/* Main heading */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="font-headline text-4xl md:text-5xl font-black text-primary leading-tight"
              >
                {t('welcome.heroTitle')}
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-on-surface-variant font-medium mt-5 text-base leading-relaxed max-w-md"
              >
                {t('welcome.heroDesc')}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="flex gap-3 mt-8"
              >
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStart}
                  className="brushed-metal text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:opacity-90"
                >
                  {t('welcome.ctaStart')}
                  <ArrowRight size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={nextStep}
                  className="bg-surface-container-lowest text-on-surface px-7 py-3.5 rounded-xl font-bold text-sm border border-outline-variant/20 flex items-center gap-2 transition-all hover:border-primary/30"
                >
                  <Play size={16} />
                  {t('welcome.ctaDemo')}
                </motion.button>
              </motion.div>

              {/* Trust Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-5 mt-10 pt-6 border-t border-outline-variant/15"
              >
                <div className="flex items-center gap-1.5 text-on-surface-variant/60">
                  <ShieldCheck size={16} className="text-primary/60" />
                  <span className="text-xs font-medium">{t('welcome.trustSSL')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant/60">
                  <BadgeCheck size={16} className="text-primary/60" />
                  <span className="text-xs font-medium">{t('welcome.trustAuth')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant/60">
                  <Languages size={16} className="text-primary/60" />
                  <span className="text-xs font-medium">TR / EN / DE</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Step 1: Categories */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <h2 className="font-headline text-2xl font-bold text-on-surface mb-2 text-center">
                {t('welcome.categoriesTitle')}
              </h2>
              <p className="text-on-surface-variant text-sm mb-6 text-center">
                {t('welcome.categoriesSubtitle')}
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {CATEGORIES.map((cat, i) => (
                  <motion.div
                    key={cat.nameKey}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 shadow-sm flex items-center gap-3 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                        {t(cat.nameKey)}
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        {cat.count.toLocaleString('tr-TR')} {t('welcome.products')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Features */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <h2 className="font-headline text-2xl font-bold text-on-surface mb-2 text-center">
                {t('welcome.featuresTitle')}
              </h2>
              <p className="text-on-surface-variant text-sm mb-8 text-center">
                {t('welcome.featuresSubtitle')}
              </p>

              <div className="grid grid-cols-2 gap-4 w-full">
                {FEATURES.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div
                      key={feat.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm flex flex-col items-center text-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
                        <Icon size={24} className="text-primary" />
                      </div>
                      <h3 className="font-headline text-sm font-bold text-on-surface">
                        {t(`welcome.feature_${feat.key}_title`)}
                      </h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {t(`welcome.feature_${feat.key}_desc`)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Ready to start */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center mb-6"
              >
                <Sparkles size={36} className="text-primary" />
              </motion.div>

              <h2 className="font-headline text-3xl font-black text-on-surface mb-3">
                {t('welcome.readyTitle')}
              </h2>
              <p className="text-on-surface-variant text-base leading-relaxed max-w-sm mb-8">
                {t('welcome.readyDesc')}
              </p>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                className="brushed-metal text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center gap-3 transition-all hover:opacity-90"
              >
                {t('welcome.startButton')}
                <ArrowRight size={22} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation controls */}
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className={`flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-lg transition-all ${
              step === 0
                ? 'text-transparent pointer-events-none'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </button>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-8 h-3 bg-primary'
                    : 'w-3 h-3 bg-outline-variant/40 hover:bg-outline-variant/70'
                }`}
              />
            ))}
          </div>

          {step < totalSteps - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-lg text-primary hover:bg-primary-fixed transition-all"
            >
              {t('common.next')}
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>
    </div>
  );
}
