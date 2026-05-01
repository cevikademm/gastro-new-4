import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, loginWithGoogle, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    taxId: '',
    sector: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.fullName || !form.email || !form.password || !form.company) {
      setError(t('auth.fillRequiredFields'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    const result = await register(form);
    if (result.success) {
      navigate('/pending-approval');
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary uppercase tracking-wider font-headline">2MC Gastro</h1>
          <p className="text-on-surface-variant mt-2 font-medium">{t('brand.tagline')}</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-8 border border-outline-variant/10">
          <h2 className="text-xl font-headline font-bold text-on-surface mb-6">{t('auth.register')}</h2>

          {error && (
            <div role="alert" className="bg-error-container text-error px-4 py-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zM8 11.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-fullName" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('auth.fullName')} *</label>
                <input id="reg-fullName" name="fullName" value={form.fullName} onChange={handleChange} required autoComplete="name" className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('common.email')} *</label>
                <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email" className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-company" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('auth.companyName')} *</label>
              <input id="reg-company" name="company" value={form.company} onChange={handleChange} required autoComplete="organization" className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-taxId" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('auth.taxId')}</label>
                <input id="reg-taxId" name="taxId" value={form.taxId} onChange={handleChange} placeholder="DE123456789" className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label htmlFor="reg-sector" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('auth.sector')}</label>
                <select id="reg-sector" name="sector" value={form.sector} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="">{t('auth.selectSector')}</option>
                  <option value="restaurant">{t('auth.sectorRestaurant')}</option>
                  <option value="hotel">{t('auth.sectorHotel')}</option>
                  <option value="catering">{t('auth.sectorCatering')}</option>
                  <option value="hospital">{t('auth.sectorHospital')}</option>
                  <option value="other">{t('auth.sectorOther')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('common.password')} *</label>
                <input id="reg-password" name="password" type="password" value={form.password} onChange={handleChange} required autoComplete="new-password" minLength={6} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label htmlFor="reg-confirmPassword" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('auth.confirmPassword')} *</label>
                <input id="reg-confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" minLength={6} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full brushed-metal text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 focus:ring-2 focus:ring-primary/50 focus:outline-none"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  {t('auth.register')}
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface-container-lowest px-3 text-on-surface-variant font-medium">{t('common.or')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 border border-outline-variant/30 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            {t('auth.googleRegister')}
          </button>

          <p className="text-center mt-6 text-sm text-on-surface-variant">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
