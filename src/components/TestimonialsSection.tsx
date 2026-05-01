import { Star, Quote } from 'lucide-react';
import { TESTIMONIALS, aggregateRating, type Testimonial } from '../content/testimonials';

type Props = {
  segment?: Testimonial['segment'];
  limit?: number;
  heading?: string;
};

export default function TestimonialsSection({ segment, limit = 6, heading }: Props) {
  const items = (segment ? TESTIMONIALS.filter((t) => t.segment === segment) : TESTIMONIALS).slice(0, limit);
  if (items.length === 0) return null;

  const agg = aggregateRating();

  return (
    <section className="bg-white border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            {heading || 'Müşterilerimiz Ne Diyor?'}
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-slate-900">{agg.value}</span>
            <span>· {agg.count}+ doğrulanmış yorum</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t) => (
            <div
              key={t.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-red-300 transition"
            >
              <Quote className="text-red-300 mb-3" size={24} />
              <p className="text-sm text-slate-700 leading-relaxed mb-4">{t.body}</p>
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                <div className="text-xs text-slate-500">
                  {t.role} · {t.company} · {t.city}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
