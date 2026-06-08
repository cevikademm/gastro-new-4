import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import SEO from '../../components/SEO';
import NewsletterSignup from '../../components/NewsletterSignup';
import { loadAllPosts } from '../../content/blog/loader';
import type { BlogPost } from '../../content/blog/posts';
import { breadcrumbSchema, organizationSchema } from '../../lib/seo';

export default function BlogListPage() {
  const [all, setAll] = useState<BlogPost[]>([]);
  useEffect(() => { loadAllPosts().then(setAll); }, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(all.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [all]);

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [all, query, category]);

  return (
    <div className="max-w-6xl mx-auto py-10">
      <SEO
        title="Blog — Endüstriyel Mutfak Rehberleri"
        description="Endüstriyel mutfak kurulumu, ekipman seçimi, HACCP uyumu ve restoran işletmeciliği üzerine uzman rehberler, karşılaştırmalar ve ipuçları."
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Blog', url: '/blog' },
          ]),
        ]}
      />

      <header className="mb-12 max-w-3xl reveal">
        <span className="inline-flex items-center gap-2 text-[var(--c-clay)] font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
          <span className="w-6 h-px bg-[var(--c-clay)]" />
          EDİTORYAL · BİLGİ KÜTÜPHANESİ
        </span>
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[var(--c-ink)] leading-[1.02]">
          Blog
        </h1>
        <p className="mt-4 text-[var(--c-muted)] max-w-2xl text-base leading-relaxed">
          Endüstriyel mutfak dünyasından rehberler, karşılaştırmalar ve uzman görüşleri — kurulum, ekipman, HACCP ve işletme için.
        </p>
      </header>

      <div className="mb-10 flex flex-col md:flex-row gap-4 md:items-center md:justify-between reveal reveal-delay-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yazılarda ara…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--c-line)] rounded-xl text-sm text-[var(--c-ink)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-clay)] focus:ring-2 focus:ring-[var(--c-clay)]/15 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                  active
                    ? 'bg-[var(--c-clay)] text-white shadow-[0_8px_20px_-8px_rgba(220,38,38,0.5)]'
                    : 'bg-white text-[var(--c-muted)] border border-[var(--c-line)] hover:border-[var(--c-clay)]/60 hover:text-[var(--c-ink)]'
                }`}
              >
                {c === 'all' ? 'Tümü' : c}
              </button>
            );
          })}
        </div>
      </div>

      {posts.length === 0 && (
        <div className="py-20 text-center text-[var(--c-muted)]">
          Sonuç bulunamadı. Farklı bir arama deneyin.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group bg-white border border-[var(--c-line)] rounded-2xl overflow-hidden hover:border-[var(--c-clay)]/40 hover:shadow-[0_24px_48px_-24px_rgba(15,36,64,0.18)] hover:-translate-y-1 transition-all duration-300"
          >
            <div className="aspect-[16/9] bg-[var(--c-bg-deep)] overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-[11px] text-[var(--c-muted)] mb-3">
                <span className="px-2.5 py-1 bg-[var(--c-clay-wash)] text-[var(--c-clay-deep)] rounded-full font-bold uppercase tracking-wider text-[10px]">
                  {post.category}
                </span>
                <span>·</span>
                <span className="font-medium">{post.readingMinutes} dk okuma</span>
              </div>
              <h2 className="font-headline text-lg font-bold text-[var(--c-ink)] group-hover:text-[var(--c-clay)] transition-colors line-clamp-2 leading-snug">
                {post.title}
              </h2>
              <p className="mt-2.5 text-sm text-[var(--c-muted)] line-clamp-3 leading-relaxed">{post.excerpt}</p>
              <div className="mt-4 pt-4 border-t border-[var(--c-line-soft)] text-[11px] text-[var(--c-muted)] uppercase tracking-[0.15em] font-medium">
                {new Date(post.datePublished).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-20 max-w-2xl mx-auto">
        <NewsletterSignup />
      </div>
    </div>
  );
}
