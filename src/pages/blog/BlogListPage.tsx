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
    <div className="max-w-6xl mx-auto px-4 py-10">
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

      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Blog</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Endüstriyel mutfak dünyasından rehberler, karşılaştırmalar ve uzman görüşleri.
        </p>
      </header>

      <div className="mb-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yazılarda ara…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#E85D26]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                category === c
                  ? 'bg-[#E85D26] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-[#E85D26]'
              }`}
            >
              {c === 'all' ? 'Tümü' : c}
            </button>
          ))}
        </div>
      </div>

      {posts.length === 0 && (
        <div className="py-16 text-center text-slate-500">
          Sonuç bulunamadı. Farklı bir arama deneyin.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#E85D26] hover:shadow-lg transition"
          >
            <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition"
                loading="lazy"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="px-2 py-0.5 bg-red-50 text-[#E85D26] rounded-full font-medium">
                  {post.category}
                </span>
                <span>·</span>
                <span>{post.readingMinutes} dk okuma</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#E85D26] transition line-clamp-2">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{post.excerpt}</p>
              <div className="mt-3 text-xs text-slate-400">
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

      <div className="mt-16 max-w-2xl mx-auto">
        <NewsletterSignup />
      </div>
    </div>
  );
}
