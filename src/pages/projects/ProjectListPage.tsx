import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore, type Project } from '../../stores/projectStore';
import { Plus, Search, Filter, ChevronRight, Trash2, Pencil, Check, X } from 'lucide-react';
import { EmptyState, EmptyProjectsIllustration } from '../../components/illustrations/EmptyState';

export default function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, deleteProject, updateProject } = useProjectStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Satır-içi proje adı düzenleme (kalem → yaz → kaydet)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const startEdit = (p: Project) => { setEditingId(p.id); setEditName(p.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };
  const saveEdit = (id: string) => {
    const name = editName.trim();
    if (name) updateProject(id, { name });
    setEditingId(null);
    setEditName('');
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColors: Record<string, string> = {
    drafting: 'bg-[var(--c-clay-wash)] text-[var(--c-clay-deep)] border-[var(--c-clay)]/15',
    quoted: 'bg-amber-100 text-amber-900 border-amber-200',
    complete: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    inProgress: 'bg-violet-100 text-violet-900 border-violet-200',
  };

  const statusLabels: Record<string, string> = {
    drafting: t('dashboard.drafting'),
    quoted: t('dashboard.quoted'),
    complete: t('dashboard.complete'),
    inProgress: t('dashboard.inProgress'),
  };

  const typeLabels: Record<string, string> = {
    commercial: t('projects.commercial'),
    hospitality: t('projects.hospitality'),
    boutique: t('projects.boutique'),
    industrial: t('projects.industrial'),
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 reveal">
        <div>
          <h1 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight">{t('projects.title')}</h1>
          <p className="text-on-surface-variant text-sm mt-1.5">{t('projects.listSubtitle')}</p>
        </div>
        <Link to="/projects/new" className="inline-flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-xl font-bold shadow-lg text-sm">
          <Plus size={18} /> {t('projects.newProject')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 reveal reveal-delay-1">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '...'}
            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-on-surface-variant" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors">
            <option value="all">{t('common.all')}</option>
            <option value="drafting">{t('dashboard.drafting')}</option>
            <option value="quoted">{t('dashboard.quoted')}</option>
            <option value="inProgress">{t('dashboard.inProgress')}</option>
            <option value="complete">{t('dashboard.complete')}</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_1px_3px_rgba(15,36,64,0.04),0_8px_24px_-12px_rgba(15,36,64,0.06)] overflow-hidden border border-outline-variant/40 reveal reveal-delay-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-container">
                <th className="px-6 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('projects.projectName')}</th>
                <th className="px-6 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('dashboard.lead')}</th>
                <th className="px-6 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('common.status')}</th>
                <th className="px-6 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('dashboard.timeline')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((project) => (
                <tr key={project.id} className="group hover:bg-surface-container-high transition-colors cursor-pointer" onDoubleClick={() => navigate(`/projects/${project.id}`)}>
                  <td className="px-6 py-5" title={t('projects.openHint', 'Girmek için çift tıklayın')}>
                    {editingId === project.id ? (
                      <div className="flex items-center gap-2" onDoubleClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(project.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 min-w-0 bg-surface-container-lowest border border-primary/40 rounded-lg px-3 py-1.5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                        <button onClick={(e) => { e.stopPropagation(); saveEdit(project.id); }} title={t('common.save', 'Kaydet')} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 shrink-0">
                          <Check size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} title={t('common.cancel', 'İptal')} className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-high shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-on-surface group-hover:text-primary transition-colors">{project.name}</div>
                        <div className="text-xs text-on-surface-variant mt-1">{typeLabels[project.type]} | {project.area} m²</div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm font-medium">{project.lead}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-1 block">{project.progress}%</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(project); }} title={t('projects.renameHint', 'Proje adını düzenle')} className="p-1.5 text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-primary/10">
                        <Pencil size={15} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="p-1.5 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-error-container">
                        <Trash2 size={16} />
                      </button>
                      <Link to={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} title={t('projects.open', 'Aç')}>
                        <ChevronRight size={20} className="text-outline-variant group-hover:text-primary transition-colors" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <EmptyState
                      illustration={<EmptyProjectsIllustration />}
                      title={t('common.noData')}
                      description={search || statusFilter !== 'all' ? t('projects.emptyFiltered') : t('projects.emptyStart')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
