import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewProjectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addProject } = useProjectStore();
  const [form, setForm] = useState({
    name: '',
    type: 'commercial' as const,
    area: '',
    lead: '',
    clientName: '',
    startDate: '',
    deadline: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.area) return;
    const newId = addProject({
      ...form,
      status: 'drafting',
      progress: 0,
      roomWidthCm: 1000,
      roomHeightCm: 600,
    });
    navigate(`/projects/${newId}`);
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft size={18} /> {t('common.back')}
      </button>

      <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{t('projects.newProject')}</h1>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant/10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.projectName')} *</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.projectType')}</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="commercial">{t('projects.commercial')}</option>
              <option value="hospitality">{t('projects.hospitality')}</option>
              <option value="boutique">{t('projects.boutique')}</option>
              <option value="industrial">{t('projects.industrial')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.area')} *</label>
            <input name="area" type="number" value={form.area} onChange={handleChange} required placeholder="m²" className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('dashboard.lead')}</label>
            <input name="lead" value={form.lead} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>

        <div className="border-t border-outline-variant/20 pt-6">
          <h3 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">{t('projects.clientInfo')}</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.clientName')}</label>
              <input name="clientName" value={form.clientName} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.startDate')}</label>
            <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.deadline')}</label>
            <input name="deadline" type="date" value={form.deadline} onChange={handleChange} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('projects.notes')}</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" className="flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all">
            <Save size={18} /> {t('projects.createProject')}
          </button>
        </div>
      </form>
    </div>
  );
}
