import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { motion } from 'motion/react';
import { Eye, EyeOff, LogIn, Refrigerator, Ruler, BarChart3, Shield } from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelector';
import { GradientDots } from '../../components/GradientDots';
import './welcome-2mc.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const FEATURES_KEYS = [
  { icon: Refrigerator, titleKey: 'welcome.featureEquipment', descKey: 'welcome.featureEquipmentDesc' },
  { icon: Ruler, titleKey: 'welcome.featureFloorPlan', descKey: 'welcome.featureFloorPlanDesc' },
  { icon: BarChart3, titleKey: 'welcome.featureQuote', descKey: 'welcome.featureQuoteDesc' },
  { icon: Shield, titleKey: 'welcome.featureHACCP', descKey: 'welcome.featureHACCPDesc' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loginWithGoogle, isLoading } = useAuthStore();
  // Dev convenience: localhost'ta sahip hesabıyla otomatik dolsun (prod'da boş kalır)
  const DEV_EMAIL = 'cevikademm@gmail.com';
  const DEV_PASSWORD = 'Adem123';
  const [email, setEmail] = useState(import.meta.env.DEV ? DEV_EMAIL : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? DEV_PASSWORD : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else if (result.pendingApproval) {
      navigate('/pending-approval');
    } else {
      setError(result.error || t('auth.invalidCredentials'));
    }
  };

  return (
    <div className="welcome-2mc min-h-screen relative overflow-hidden">
      <GradientDots className="z-0 pointer-events-none opacity-30" backgroundColor="#ffffff" />

      {/* Language switcher */}
      <div className="absolute top-5 right-5 z-30">
        <LanguageSelector variant="light" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-stretch">
        {/* ── LEFT: Editorial brand panel ── */}
        <div className="lg:w-[55%] flex flex-col justify-between px-6 sm:px-10 lg:px-16 pt-10 pb-8 border-b lg:border-b-0 lg:border-r border-black/[0.06]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-10"
          >
            <img src="/logo-2mc-gastro.png" alt="2MC Gastro" className="h-14 w-auto max-w-[220px] object-contain" />
          </motion.div>

          {/* Top meta bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] border-b border-black/[0.06] pb-3 mb-8"
          >
            <span>// 2MC—GASTRO / LOGIN_001</span>
            <span className="hidden md:block">EST. 2010 · ANTALYA / TR</span>
            <span className="text-[rgb(220, 38, 38)]">● ONLINE</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <div className="flex items-center gap-3 mb-5 text-[10px] font-mono uppercase tracking-[0.3em] text-[rgb(220, 38, 38)]">
              <span className="w-8 h-px bg-[rgb(220, 38, 38)]/50" />
              <span>{t('welcome.heroEyebrow', 'Manifesto · Vol. I')}</span>
            </div>

            <h2 className="font-black leading-[0.92] tracking-[-0.03em] text-[8vw] md:text-[5rem] lg:text-[5.5rem] break-words">
              {t('welcome.headline', 'Endüstriyel Mutfağın')}
              <br />
              <span className="italic text-[rgb(220, 38, 38)]">
                {t('welcome.headlineSub', 'Komuta Merkezi')}.
              </span>
            </h2>

            <p className="mt-6 text-base lg:text-lg max-w-lg leading-relaxed">
              {t('welcome.subtitle')}
            </p>

            {/* Features grid */}
            <div className="hidden lg:grid grid-cols-2 gap-px bg-black/[0.06] mt-12 max-w-2xl">
              {FEATURES_KEYS.map((f, i) => {
                const Icon = f.icon;
                const num = String(i + 1).padStart(2, '0');
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="group bg-white p-5 hover:bg-[#fafafa] transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-[10px] font-mono text-[rgb(220, 38, 38)] pt-1">[{num}]</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon size={18} className="text-[rgb(220, 38, 38)]" />
                          <h4 className="font-bold text-sm tracking-tight">{t(f.titleKey)}</h4>
                        </div>
                        <p className="text-xs leading-relaxed">{t(f.descKey)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <div className="pt-8 mt-8 border-t border-black/[0.06] text-[10px] font-mono uppercase tracking-[0.2em]">
            {t('welcome.copyright')}
          </div>
        </div>

        {/* ── RIGHT: Form ── */}
        <div className="lg:w-[45%] flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md bg-white border border-black/[0.06] p-8 lg:p-10"
          >
            <div className="mb-8">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[rgb(220, 38, 38)] mb-3">
                // ACCESS_TERMINAL
              </div>
              <h2 className="text-3xl font-black tracking-tight">
                {t('auth.login')}
              </h2>
              <p className="mt-2 text-sm">
                {t('auth.loginSubtitle')}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 mb-5 text-sm font-medium flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zM8 11.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/></svg>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                  {t('common.email')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  required
                  className="w-full bg-[#fafafa] border border-black/[0.08] py-3.5 px-4 text-sm focus:border-[rgb(220, 38, 38)] focus:ring-2 focus:ring-[rgb(220, 38, 38)]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                  {t('common.password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="current-password"
                    required
                    className="w-full bg-[#fafafa] border border-black/[0.08] py-3.5 px-4 pr-12 text-sm focus:border-[rgb(220, 38, 38)] focus:ring-2 focus:ring-[rgb(220, 38, 38)]/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[rgb(220, 38, 38)] focus:text-[rgb(220, 38, 38)] focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[rgb(220, 38, 38)]" />
                  <span className="text-sm">{t('auth.rememberMe')}</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-[rgb(220, 38, 38)] font-semibold hover:underline">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[rgb(220, 38, 38)] hover:bg-[rgb(153, 27, 27)] text-white py-3.5 font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:ring-2 focus:ring-[rgb(220, 38, 38)]/50 focus:outline-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    {t('auth.login')}
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.08]" />
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-[0.25em]">
                <span className="bg-white px-3">{t('common.or')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle().then(() => navigate('/dashboard'))}
              disabled={isLoading}
              aria-label="Sign in with Google"
              className="w-full flex items-center justify-center gap-3 border border-black/[0.08] bg-[#f7f7f7] hover:bg-[#efefef] text-[#333] py-3.5 font-semibold uppercase tracking-[0.1em] text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[rgb(220, 38, 38)]/50 focus:outline-none"
            >
              <GoogleIcon />
              {t('auth.googleLogin')}
            </button>

            <p className="text-center mt-8 text-sm">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-[rgb(220, 38, 38)] font-bold hover:underline">
                {t('auth.register')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
