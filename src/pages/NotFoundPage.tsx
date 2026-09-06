import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Sunucu (api/render.ts) gerçek 404 kodu verir; istemci içi geçişlerde en azından noindex. */}
      <SEO title={t('notFound.title', { defaultValue: 'Seite nicht gefunden' })} noindex hreflang={false} />
      {/* Decorative gradient orbs */}
      <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-[var(--c-clay)]/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-[var(--c-navy)]/8 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative max-w-xl w-full text-center reveal">
        <div className="font-headline text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter bg-gradient-to-br from-[var(--c-clay)] to-[var(--c-clay-deep)] bg-clip-text text-transparent select-none">
          404
        </div>

        <p className="text-2xl md:text-3xl font-headline font-bold text-on-surface mt-2 tracking-tight">
          {t('notFound.title', { defaultValue: 'Seite nicht gefunden' })}
        </p>
        <p className="text-on-surface-variant mt-3 max-w-md mx-auto leading-relaxed">
          {t('notFound.message', { defaultValue: 'Die gesuchte Seite existiert nicht oder wurde verschoben.' })}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Link
            to="/"
            className="group inline-flex items-center justify-center gap-2 brushed-metal text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg w-full sm:w-auto"
          >
            <Home size={16} />
            {t('notFound.backHome', { defaultValue: 'Zur Startseite' })}
          </Link>
          <button
            onClick={() => history.back()}
            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors w-full sm:w-auto"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            {t('common.goBack')}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-outline-variant/30 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
          {[
            { label: t('notFound.linkCatalog'), path: '/produkte' },
            { label: t('notFound.linkPlanning'), path: '/kitchen-planner' },
            { label: t('notFound.linkProjects'), path: '/projects' },
            { label: t('notFound.linkSupport'), path: '/support' },
          ].map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-[var(--c-clay)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
