import { useTranslation } from 'react-i18next';
import { Users, Settings, Zap, Wrench, Calendar } from 'lucide-react';

export function TrustBar() {
  const { t } = useTranslation();
  const items = [
    {
      icon: <Users className="w-5 h-5 text-brand-red shrink-0" />,
      title: t('landing.trust.customers.title'),
      desc: t('landing.trust.customers.desc')
    },
    {
      icon: <Settings className="w-5 h-5 text-brand-red shrink-0" />,
      title: t('landing.trust.configs.title'),
      desc: t('landing.trust.configs.desc')
    },
    {
      icon: <Zap className="w-5 h-5 text-brand-red shrink-0" />,
      title: t('landing.trust.express.title'),
      desc: t('landing.trust.express.desc')
    },
    {
      icon: <Wrench className="w-5 h-5 text-brand-red shrink-0" />,
      title: t('landing.trust.deployments.title'),
      desc: t('landing.trust.deployments.desc')
    },
    {
      icon: <Calendar className="w-5 h-5 text-brand-red shrink-0" />,
      title: t('landing.trust.experience.title'),
      desc: t('landing.trust.experience.desc')
    }
  ];

  return (
    <div className="w-full max-w-[100vw] overflow-hidden bg-white border-b border-slate-200 relative z-20 py-4 sm:py-6">
      <div className="lp-container flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-0 lg:divide-x divide-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={`min-w-[200px] shrink-0 snap-start sm:min-w-0 sm:shrink flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-[0_8px_20px_-18px_rgba(15,36,64,0.5)] transition-transform duration-300 hover:translate-y-[-2px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${index > 0 ? 'lg:pl-6 xl:pl-8' : ''}`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0">
              <h4 className="text-[10px] sm:text-[11px] font-black text-[#0F2440] uppercase tracking-wider leading-tight">{item.title}</h4>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
