import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function PendingApprovalPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-[var(--c-clay)]/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-[var(--c-navy)]/8 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md text-center">
        <div className="mb-8 reveal">
          <h1 className="font-headline text-2xl font-black tracking-[0.05em] uppercase text-primary">2MC Gastro</h1>
          <div className="mt-2 h-px w-16 bg-[var(--c-clay)] mx-auto" />
        </div>

        <div className="bg-surface-container-lowest rounded-3xl shadow-[0_24px_64px_-24px_rgba(15,36,64,0.2)] p-8 sm:p-10 border border-outline-variant/40 reveal reveal-delay-1">
          <div className="relative w-20 h-20 mx-auto mb-7">
            <div className="absolute inset-0 rounded-full bg-warning-container animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-warning-container/80 flex items-center justify-center">
              <Clock size={28} className="text-warning" strokeWidth={1.75} />
            </div>
          </div>

          <h2 className="text-2xl font-headline font-black text-on-surface mb-3 tracking-tight">
            {t('pending.title')}
          </h2>

          <p className="text-on-surface-variant text-[15px] leading-relaxed mb-7 max-w-sm mx-auto">
            {t('pending.message')}
          </p>

          <div className="bg-surface-container-low rounded-xl p-4 mb-7 border border-outline-variant/40 text-left">
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
              <p
                className="text-xs text-on-surface-variant leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t('pending.timeInfo') }}
              />
            </div>
          </div>

          <a
            href="mailto:support@2mcgastro.com"
            className="inline-flex items-center gap-2 text-on-surface-variant text-xs font-semibold hover:text-[var(--c-clay)] transition-colors mb-6"
          >
            <Mail size={14} /> support@2mcgastro.com
          </a>

          <div className="border-t border-outline-variant/40 pt-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
            >
              <ArrowLeft size={14} />
              {t('pending.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
