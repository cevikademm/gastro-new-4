import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Save, Key, AlertTriangle, User } from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuthStore();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSave = () => {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{t('profile.title')}</h1>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant/10 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-outline-variant/10">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-lg">{user?.fullName}</h2>
            <p className="text-sm text-on-surface-variant">{user?.email}</p>
            <p className="text-xs text-primary font-bold mt-1">{user?.role} - {user?.company}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('auth.fullName')}</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.email')}</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.phone')}</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.address')}</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {saved && <span className="text-emerald-600 text-sm font-medium self-center">Kaydedildi!</span>}
          <button onClick={handleSave} className="flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all">
            <Save size={18} /> {t('profile.updateProfile')}
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant/10 space-y-6">
        <h2 className="font-headline font-bold text-primary uppercase tracking-wider text-sm flex items-center gap-2">
          <Key size={18} /> {t('profile.changePassword')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('profile.currentPassword')}</label>
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('profile.newPassword')}</label>
            <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('profile.confirmNewPassword')}</label>
            <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>
        <button className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-primary px-6 py-3 rounded-lg font-bold text-sm transition-colors">
          <Key size={18} /> {t('profile.changePassword')}
        </button>
      </div>

      <div className="bg-error-container/20 rounded-xl shadow-sm p-8 border border-error/10 space-y-4">
        <h2 className="font-headline font-bold text-error uppercase tracking-wider text-sm flex items-center gap-2">
          <AlertTriangle size={18} /> {t('profile.deleteAccount')}
        </h2>
        <p className="text-sm text-on-surface-variant">{t('profile.deleteWarning')}</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} className="px-6 py-3 bg-error/10 text-error rounded-lg font-bold text-sm hover:bg-error/20 transition-colors">
            {t('profile.deleteAccount')}
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleDelete} className="px-6 py-3 bg-error text-white rounded-lg font-bold text-sm hover:bg-error/90 transition-colors">
              {t('common.confirm')}
            </button>
            <button onClick={() => setShowDelete(false)} className="px-6 py-3 bg-surface-container-high text-on-surface rounded-lg font-medium text-sm">
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
