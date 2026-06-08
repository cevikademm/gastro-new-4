import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore';
import {
  ArrowLeft, Save, Upload, X, Image as ImageIcon,
  Flame, Droplets, Refrigerator, Table, Microwave, Waves, Package
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'cooking', label: 'Pişirme', icon: Flame, color: '#ef4444' },
  { value: 'cold', label: 'Soğutma', icon: Refrigerator, color: '#3b82f6' },
  { value: 'cleaning', label: 'Temizlik', icon: Droplets, color: '#06b6d4' },
  { value: 'neutral', label: 'Nötr', icon: Table, color: '#6b7280' },
  { value: 'other', label: 'Diğer', icon: Package, color: '#8b5cf6' },
];

const ICON_OPTIONS = [
  { value: 'microwave', label: 'Fırın', icon: Microwave },
  { value: 'flame', label: 'Ocak/Izgara', icon: Flame },
  { value: 'refrigerator', label: 'Soğutucu', icon: Refrigerator },
  { value: 'droplets', label: 'Bulaşık M.', icon: Droplets },
  { value: 'waves', label: 'Evye', icon: Waves },
  { value: 'table', label: 'Tezgah', icon: Table },
];

export default function AddProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { addProductToProject, projects } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find(p => p.id === projectId);

  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'cooking' as 'cooking' | 'cold' | 'cleaning' | 'neutral' | 'other',
    icon: 'microwave',
    width: '',
    height: '',
    depth: '',
    kw: '',
    powerType: 'electric' as 'electric' | 'gas' | 'none',
    price: '',
    description: '',
    brand: '',
    series: '',
    features: '',
  });

  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Maksimum dosya boyutu 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setImageData(data);
      setImagePreview(data);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    setImageData(undefined);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name) { setFormError('Ürün adı zorunludur.'); return; }
    if (!projectId) { setFormError('Proje bulunamadı.'); return; }

    addProductToProject(projectId, {
      name: form.name,
      code: form.code || `PROD-${Date.now().toString(36).toUpperCase()}`,
      category: form.category,
      icon: form.icon,
      imageData,
      dimensions: {
        width: Number(form.width) || 80,
        height: Number(form.height) || 70,
        depth: Number(form.depth) || 85,
      },
      kw: Number(form.kw) || 0,
      powerType: form.powerType,
      price: Number(form.price) || 0,
      description: form.description,
      brand: form.brand,
      series: form.series,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
    });

    navigate(`/projects/${projectId}`);
  };

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto w-full text-center py-20">
        <p className="text-on-surface-variant">Proje bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5 pb-24 md:pb-0">
      <button onClick={() => navigate(`/projects/${projectId}`)} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft size={18} /> {project.name} projesine geri dön
      </button>

      <div>
        <h1 className="font-headline text-2xl md:text-3xl font-black text-on-surface tracking-tight">Yeni Ürün Ekle</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          <span className="font-bold text-primary">{project.name}</span> projesine ürün ekleyin
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium border border-red-200">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image Upload */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
          <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">Ürün Görseli</h2>

          {imagePreview ? (
            <div className="relative w-full max-w-md mx-auto">
              <img src={imagePreview} alt="Ürün" className="w-full h-64 object-contain bg-slate-50 rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              className={`w-full max-w-md mx-auto h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary hover:bg-slate-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Upload size={28} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600">Görsel yüklemek için tıklayın veya sürükleyin</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP (maks. 5MB)</p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Basic Info */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
          <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">Temel Bilgiler</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Ürün Adı *</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="ör: Konveksiyonlu Fırın Pro" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Ürün Kodu</label>
              <input name="code" value={form.code} onChange={handleChange} placeholder="ör: VF-OVN-601-EL" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Marka</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="ör: 2MC" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Seri</label>
              <input name="series" value={form.series} onChange={handleChange} placeholder="ör: 70er" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Açıklama</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Ürün hakkında kısa açıklama..." className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
        </div>

        {/* Category & Icon */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
          <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">Kategori ve İkon</h2>

          <div className="mb-5">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Kategori *</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value as any })}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                      isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} style={{ color: cat.color }} />
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-primary' : 'text-slate-500'}`}>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Plan İkonu</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.icon === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, icon: opt.value })}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={18} className={isSelected ? 'text-primary' : 'text-slate-400'} />
                    <span className={`text-[9px] font-bold ${isSelected ? 'text-primary' : 'text-slate-400'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dimensions & Technical */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
          <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">Teknik Özellikler</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Genişlik (cm)</label>
              <input name="width" type="number" value={form.width} onChange={handleChange} placeholder="80" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Yükseklik (cm)</label>
              <input name="height" type="number" value={form.height} onChange={handleChange} placeholder="70" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Derinlik (cm)</label>
              <input name="depth" type="number" value={form.depth} onChange={handleChange} placeholder="85" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Güç (kW)</label>
              <input name="kw" type="number" step="0.1" value={form.kw} onChange={handleChange} placeholder="12.0" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Enerji Tipi</label>
              <select name="powerType" value={form.powerType} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="electric">Elektrik</option>
                <option value="gas">Doğalgaz</option>
                <option value="none">Yok (Pasif)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Fiyat (€)</label>
              <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="7800" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Özellikler (virgülle ayırın)</label>
            <input name="features" value={form.features} onChange={handleChange} placeholder="ör: Buhar enjeksiyonu, Dokunmatik ekran, Otomatik programlar" className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/projects/${projectId}`)} className="px-6 py-3 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            İptal
          </button>
          <button type="submit" className="flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all">
            <Save size={18} /> Ürünü Kaydet
          </button>
        </div>
      </form>

      {/* Mobile Sticky Bottom Actions */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex gap-3 shadow-lg">
        <button type="button" onClick={() => navigate(`/projects/${projectId}`)} className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
          İptal
        </button>
        <button
          type="button"
          onClick={() => {
            if (!form.name) { setFormError('Ürün adı zorunludur.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
            setFormError('');
            if (!projectId) return;
            addProductToProject(projectId, {
              name: form.name,
              code: form.code || `PROD-${Date.now().toString(36).toUpperCase()}`,
              category: form.category,
              icon: form.icon,
              imageData,
              dimensions: {
                width: Number(form.width) || 80,
                height: Number(form.height) || 70,
                depth: Number(form.depth) || 85,
              },
              kw: Number(form.kw) || 0,
              powerType: form.powerType,
              price: Number(form.price) || 0,
              description: form.description,
              brand: form.brand,
              series: form.series,
              features: form.features.split(',').map(f => f.trim()).filter(Boolean),
            });
            navigate(`/projects/${projectId}`);
          }}
          className="flex-1 flex items-center justify-center gap-2 brushed-metal text-white py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all"
        >
          <Save size={18} /> Ürünü Kaydet
        </button>
      </div>
    </div>
  );
}
