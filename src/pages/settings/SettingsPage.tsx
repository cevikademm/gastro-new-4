import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Save, Globe, Bell, Palette, Building, User, ShieldCheck, Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Upload } from 'lucide-react';
import { useBannerStore } from '../../stores/bannerStore';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const { showPromoProducts, setShowPromoProducts } = useUIStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const [lang, setLang] = useState(user?.language || 'tr');
  const [region, setRegion] = useState(user?.region || 'EU');
  const [currency, setCurrency] = useState(user?.currency || 'EUR');
  const [dateFormat, setDateFormat] = useState(user?.dateFormat || 'DD.MM.YYYY');
  const [notifs, setNotifs] = useState(user?.notifications || { email: true, push: true, projectUpdates: true, bomChanges: true });

  const handleSave = () => {
    updateProfile({ language: lang, region, currency, dateFormat, notifications: notifs });
    i18n.changeLanguage(lang);
    try { localStorage.setItem('2mc_lang', lang); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: t('settings.userProfile'), icon: User },
    { id: 'company', label: t('settings.companyInfo'), icon: Building },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'language', label: t('settings.languageRegion'), icon: Globe },
    { id: 'theme', label: t('settings.themePreference'), icon: Palette },
    ...(isAdmin ? [{ id: 'admin', label: t('settings.adminSettings'), icon: ShieldCheck }] : []),
    ...(isAdmin ? [{ id: 'banners', label: t('settings.banners', 'Banner Yönetimi'), icon: ImageIcon }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 py-8 px-4 sm:px-6">
      <div>
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight">{t('settings.title')}</h1>
        <p className="text-on-surface-variant text-sm mt-1.5">{t('settings.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-64 flex lg:flex-col gap-1.5 overflow-x-auto bg-surface-container-lowest lg:bg-transparent p-2 lg:p-0 rounded-xl border lg:border-0 border-outline-variant/40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative ${active ? 'bg-primary text-white shadow-[0_4px_12px_-4px_rgba(30,58,95,0.4)]' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
              >
                <Icon size={16} strokeWidth={1.75} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 bg-surface-container-lowest rounded-2xl shadow-[0_1px_3px_rgba(15,36,64,0.04),0_8px_24px_-12px_rgba(15,36,64,0.06)] p-6 sm:p-8 border border-outline-variant/40">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.userProfile')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('auth.fullName')}</label>
                  <input defaultValue={user?.fullName} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.email')}</label>
                  <input defaultValue={user?.email} type="email" className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.phone')}</label>
                  <input defaultValue={user?.phone} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.address')}</label>
                  <input defaultValue={user?.address} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.companyInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.company')}</label>
                  <input defaultValue={user?.company} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('auth.taxId')}</label>
                  <input defaultValue={user?.taxId} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.notifications')}</h2>
              {[
                { key: 'email', label: t('settings.emailNotifications') },
                { key: 'push', label: t('settings.pushNotifications') },
                { key: 'projectUpdates', label: t('settings.projectUpdates') },
                { key: 'bomChanges', label: t('settings.bomChanges') },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between py-3 border-b border-outline-variant/10">
                  <span className="text-sm font-medium">{item.label}</span>
                  <button
                    onClick={() => setNotifs({ ...notifs, [item.key]: !(notifs as any)[item.key] })}
                    className={`w-12 h-6 rounded-full transition-colors ${(notifs as any)[item.key] ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${(notifs as any)[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.languageRegion')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.language')}</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors">
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="nl">🇳🇱 Nederlands</option>
                    <option value="it">🇮🇹 Italiano</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="pt">🇵🇹 Português</option>
                    <option value="pl">🇵🇱 Polski</option>
                    <option value="cs">🇨🇿 Čeština</option>
                    <option value="ro">🇷🇴 Română</option>
                    <option value="el">🇬🇷 Ελληνικά</option>
                    <option value="sv">🇸🇪 Svenska</option>
                    <option value="da">🇩🇰 Dansk</option>
                    <option value="hu">🇭🇺 Magyar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('settings.region')}</label>
                  <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors">
                    <option value="EU">{t('settings.regionEU')}</option>
                    <option value="TR">{t('settings.regionTR')}</option>
                    <option value="US">{t('settings.regionUS')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('settings.currency')}</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors">
                    <option value="EUR">EUR (€)</option>
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('settings.dateFormat')}</label>
                  <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors">
                    <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.themePreference')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-6 rounded-xl border-2 border-primary bg-white text-center">
                  <div className="w-full h-20 bg-surface-container rounded-lg mb-3" />
                  <span className="text-sm font-bold">{t('common.lightMode')}</span>
                </button>
                <button className="p-6 rounded-xl border-2 border-outline-variant/20 bg-white text-center hover:border-primary/50 transition-colors">
                  <div className="w-full h-20 bg-slate-800 rounded-lg mb-3" />
                  <span className="text-sm font-bold text-on-surface-variant">{t('common.darkMode')}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'banners' && isAdmin && <BannerSettings />}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.adminSettings')}</h2>
              <p className="text-xs text-on-surface-variant">{t('settings.adminDescription')}</p>

              <label className="flex items-center justify-between py-4 px-4 bg-surface-container-high/30 rounded-xl border border-outline-variant/10">
                <div>
                  <p className="text-sm font-bold text-on-surface">{t('settings.showPromoProducts')}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {t('settings.showPromoDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setShowPromoProducts(!showPromoProducts)}
                  className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${showPromoProducts ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${showPromoProducts ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-outline-variant/10 flex justify-end">
            {saved && <span className="text-emerald-600 text-sm font-medium mr-4 self-center">{t('common.saved')}</span>}
            <button onClick={handleSave} className="flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all">
              <Save size={18} /> {t('settings.saveSettings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerSettings() {
  const { t } = useTranslation();
  const { slides, intervalMs, updateSlide, addSlide, removeSlide, moveSlide, setIntervalMs, resetToDefaults } = useBannerStore();

  const handleImageUpload = (id: string, file: File | null) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert(t('settings.bannerImageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateSlide(id, { image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs flex items-center gap-2 pb-3 mb-5 border-b border-outline-variant/40">{t('settings.banners')}</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {t('settings.bannerDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addSlide}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
          >
            <Plus size={16} /> {t('settings.addSlide')}
          </button>
          <button
            onClick={() => {
              if (confirm(t('settings.resetSlidesConfirm'))) resetToDefaults();
            }}
            className="flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-high"
          >
            <RotateCcw size={16} /> {t('common.reset')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-high/30 rounded-xl border border-outline-variant/10">
        <label className="text-xs font-bold uppercase text-on-surface-variant">{t('settings.autoSlideInterval')}</label>
        <input
          type="number"
          min={2}
          max={60}
          value={Math.round(intervalMs / 1000)}
          onChange={(e) => setIntervalMs(Math.max(2, Number(e.target.value)) * 1000)}
          className="w-24 bg-surface-container-highest rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
        />
      </div>

      <div className="space-y-4">
        {slides.map((slide, idx) => (
          <div key={slide.id} className="border border-outline-variant/15 rounded-xl p-4 bg-surface-container-high/20">
            <div className="flex gap-4">
              {/* Preview */}
              <div
                className="w-48 h-20 rounded-lg flex-shrink-0 flex items-end p-2 overflow-hidden relative"
                style={
                  slide.image
                    ? { backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: slide.gradient }
                }
              >
                {slide.image && <div className="absolute inset-0 bg-black/40" />}
                <span className="relative text-[9px] text-white font-mono uppercase tracking-wider truncate">
                  {slide.eyebrow}
                </span>
              </div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={slide.eyebrow}
                  onChange={(e) => updateSlide(slide.id, { eyebrow: e.target.value })}
                  placeholder={t('settings.bannerEyebrowPlaceholder')}
                  className="bg-surface-container-highest rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                <input
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                  placeholder={t('settings.bannerTitlePlaceholder')}
                  className="bg-surface-container-highest rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                <input
                  value={slide.subtitle}
                  onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })}
                  placeholder={t('settings.bannerSubtitlePlaceholder')}
                  className="md:col-span-2 bg-surface-container-highest rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                <input
                  value={slide.gradient}
                  onChange={(e) => updateSlide(slide.id, { gradient: e.target.value })}
                  placeholder={t('settings.bannerGradientPlaceholder')}
                  className="md:col-span-2 bg-surface-container-highest rounded-lg py-2 px-3 text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveSlide(slide.id, -1)}
                  disabled={idx === 0}
                  className="p-2 rounded-lg hover:bg-surface-container-highest disabled:opacity-30"
                  title={t('common.moveUp')}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => moveSlide(slide.id, 1)}
                  disabled={idx === slides.length - 1}
                  className="p-2 rounded-lg hover:bg-surface-container-highest disabled:opacity-30"
                  title={t('common.moveDown')}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('settings.deleteSlideConfirm'))) removeSlide(slide.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"
                  title={t('common.delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-outline-variant/10 flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={slide.enabled}
                  onChange={(e) => updateSlide(slide.id, { enabled: e.target.checked })}
                />
                {t('settings.bannerVisible')}
              </label>

              <div className="flex items-center gap-2">
                {slide.image && (
                  <button
                    onClick={() => updateSlide(slide.id, { image: undefined })}
                    className="text-xs text-red-500 font-medium hover:underline"
                  >
                    {t('settings.bannerRemoveImage')}
                  </button>
                )}
                <label className="flex items-center gap-2 bg-surface-container-highest hover:bg-surface-container-high px-3 py-2 rounded-lg text-xs font-bold cursor-pointer">
                  <Upload size={14} />
                  {slide.image ? t('settings.bannerChangeImage') : t('settings.bannerUploadImage')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(slide.id, e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-on-surface-variant">
        {t('settings.bannerTipBefore')}<strong>{t('settings.bannerTipDimension')}</strong>{t('settings.bannerTipAfter')}
      </p>
    </div>
  );
}
