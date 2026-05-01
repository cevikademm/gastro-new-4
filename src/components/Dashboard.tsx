import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { Plus, Filter, ChevronRight, History, Refrigerator, FolderOpen, ArrowRight } from 'lucide-react';
import { GradientDots } from './GradientDots';
import '../pages/auth/welcome-2mc.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const { projects, activities } = useProjectStore();
  const { user } = useAuthStore();

  const statusColors: Record<string, string> = {
    drafting: 'bg-info-container text-on-info-container border-info/20',
    quoted: 'bg-warning-container text-on-warning-container border-warning/20',
    complete: 'bg-success-container text-on-success-container border-success/20',
    inProgress: 'bg-primary-fixed text-primary border-primary/20',
  };

  const statusLabels: Record<string, string> = {
    drafting: t('dashboard.drafting'),
    quoted: t('dashboard.quoted'),
    complete: t('dashboard.complete'),
    inProgress: t('dashboard.inProgress'),
  };

  return (
    <div className="welcome-2mc relative min-h-full">
      <GradientDots className="z-0 pointer-events-none opacity-30 absolute inset-0" backgroundColor="#ffffff" />

      <div className="relative z-10 max-w-7xl mx-auto w-full space-y-10 p-3 sm:p-4 md:p-6">
        {/* Top meta bar */}
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] border-b border-black/[0.06] pb-3">
          <span>// 2MC—GASTRO / DASHBOARD_001</span>
          <span className="hidden md:block">EST. 2010 · ANTALYA / TR</span>
          <span className="text-primary">● ONLINE</span>
        </div>

        {/* Hero header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.3em] text-primary">
              <span className="w-8 h-px bg-primary/50" />
              <span>{t('dashboard.eyebrow', 'Overview · Vol. I')}</span>
            </div>
            <h1 className="font-black text-2xl sm:text-3xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[0.95]">
              {t('dashboard.title')}
            </h1>
            <p className="mt-3 text-base">
              {t('dashboard.welcome', { name: user?.fullName || t('common.user'), count: projects.length })}
            </p>
          </div>
          <Link
            to="/projects/new"
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-6 py-3.5 font-bold uppercase tracking-[0.1em] text-sm transition-all w-full sm:w-auto justify-center"
          >
            <Plus size={18} /> {t('dashboard.newProject')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-black/[0.06]">
          {/* Active projects */}
          <div className="lg:col-span-8 bg-white flex flex-col">
            <div className="p-6 border-b border-black/[0.06] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-primary">[01]</span>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">{t('dashboard.activeProjects')}</h2>
              </div>
              <Link to="/projects" className="text-[#777] hover:text-primary transition-colors">
                <Filter size={18} />
              </Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-black/[0.06]">
                    <th className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase">{t('dashboard.projectName')}</th>
                    <th className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase">{t('dashboard.lead')}</th>
                    <th className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase">{t('common.status')}</th>
                    <th className="px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase">{t('dashboard.timeline')}</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 5).map((project) => (
                    <tr key={project.id} className="group hover:bg-[#fafafa] transition-colors cursor-pointer border-b border-black/[0.04] last:border-b-0">
                      <td className="px-6 py-5">
                        <Link to={`/projects/${project.id}`}>
                          <div className="font-bold">{project.name}</div>
                          <div className="text-xs mt-1">{project.type} | {project.area} m²</div>
                        </Link>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium">{project.lead}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase border ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-24 h-1 bg-black/[0.06] overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${project.progress}%` }}></div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link to={`/projects/${project.id}`}>
                          <ChevronRight size={18} className="text-[#999] group-hover:text-primary transition-colors inline-block" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 bg-white flex flex-col">
            <div className="p-6 border-b border-black/[0.06] flex items-center gap-3">
              <span className="text-[10px] font-mono text-primary">[02]</span>
              <History size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-[0.2em]">{t('dashboard.recentActivity')}</h2>
            </div>
            <div className="p-6 space-y-6 flex-1">
              {activities.map((activity, i) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${activity.active ? 'bg-primary' : 'bg-black/20'}`}></div>
                    {i < activities.length - 1 && <div className="w-px h-full bg-black/[0.08] mt-2"></div>}
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="text-sm font-bold">{t(`dashboard.${activity.title}`, { defaultValue: activity.title })}</p>
                    <p className="text-xs mt-0.5">{activity.desc}</p>
                    <p className="text-[10px] text-primary font-mono mt-1.5 uppercase tracking-[0.15em]">
                      {activity.time === 'yesterday' ? t('dashboard.yesterday') : activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-px bg-black/[0.06] border-t border-black/[0.06]">
              <Link to="/catalog" className="bg-primary hover:bg-primary-container p-5 flex flex-col justify-between group transition-colors min-h-[100px] sm:min-h-[120px] md:min-h-[140px]">
                <Refrigerator className="text-white mb-4" size={26} />
                <span className="text-white font-bold text-xs uppercase tracking-[0.1em] leading-tight">{t('dashboard.equipmentCatalog')}</span>
              </Link>
              <Link to="/docs" className="bg-[#fafafa] hover:bg-[#f0f0f0] p-5 flex flex-col justify-between group transition-colors min-h-[100px] sm:min-h-[120px] md:min-h-[140px]">
                <FolderOpen className="text-primary mb-4" size={26} />
                <span className="text-primary font-bold text-xs uppercase tracking-[0.1em] leading-tight">{t('dashboard.standardsGuides')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Featured catalog */}
        <div className="space-y-6 pt-6">
          <div className="flex items-baseline justify-between border-b border-black/[0.06] pb-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-primary">[03]</span>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em]">{t('dashboard.featuredItems')}</h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#999]">↓ 03 Items</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.06]">
            {[
              { tag: 'Vulcan Series', title: 'Endurance\u2122 Gas Ranges' },
              { tag: 'PowerSteam', title: 'Combi-Oven Elite' },
              { tag: 'ColdChain', title: 'Walk-in Modular Units' },
            ].map((item, i) => {
              const num = String(i + 1).padStart(2, '0');
              return (
                <Link key={i} to="/catalog" className="relative group bg-white h-64 cursor-pointer overflow-hidden">
                  <div className="w-full h-full bg-[#fafafa] flex items-center justify-center group-hover:bg-[#f0f0f0] transition-colors">
                    <Refrigerator size={72} className="text-primary/20 group-hover:text-primary/40 transition-colors" />
                  </div>
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono text-primary">[{num}]</span>
                      <ArrowRight size={16} className="text-[#999] group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary block mb-1">{item.tag}</span>
                      <h3 className="font-black text-lg tracking-tight">{item.title}</h3>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
