import { useTranslation } from 'react-i18next';

export default function FaqSection({ faqs, title }: { faqs: Array<{ q: string; a: string }>; title?: string }) {
  const { t } = useTranslation();
  if (!faqs.length) return null;
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[#0F2440] mb-6">{title || t('seo.faqTitle', 'Häufige Fragen')}</h2>
      <div className="divide-y divide-slate-200 rounded-2xl bg-white border border-slate-200">
        {faqs.map((f, i) => (
          <details key={i} className="group px-5 py-4" open={i === 0}>
            <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-bold text-[#0F2440]">
              <h3 className="text-base font-bold">{f.q}</h3>
              <span className="text-brand-red transition-transform group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
