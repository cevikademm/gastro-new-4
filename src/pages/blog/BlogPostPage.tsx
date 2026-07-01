import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import { loadAllPosts, loadPostBySlug } from '../../content/blog/loader';
import type { BlogPost } from '../../content/blog/posts';
import { articleSchema, breadcrumbSchema, faqSchema } from '../../lib/seo';

function renderBody(body: string) {
  const blocks = body.trim().split(/\n\n+/);
  return blocks.map((block, i) => {
    if (block.startsWith('## ')) {
      return (
        <h2 key={i} className="text-2xl font-bold mt-10 mb-4 text-slate-900">
          {block.replace(/^##\s+/, '')}
        </h2>
      );
    }
    if (block.startsWith('- ')) {
      const items = block.split('\n').map((l) => l.replace(/^-\s+/, ''));
      return (
        <ul key={i} className="list-disc pl-6 my-4 space-y-1 text-[var(--c-ink-soft)]">
          {items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="my-4 text-[var(--c-ink-soft)] leading-relaxed">
        {block}
      </p>
    );
  });
}

export default function BlogPostPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | undefined | null>(undefined);
  const [related, setRelated] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const p = await loadPostBySlug(slug);
      if (cancelled) return;
      setPost(p || null);
      if (p) {
        const all = await loadAllPosts();
        if (!cancelled) setRelated(all.filter((x) => x.slug !== p.slug).slice(0, 3));
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (post === undefined) return <div className="max-w-3xl mx-auto px-4 py-20 text-slate-500">{t('common.loading')}</div>;
  if (post === null) return <Navigate to="/blog" replace />;

  const schemas: object[] = [
    articleSchema({
      title: post.title,
      description: post.description,
      image: post.image,
      datePublished: post.datePublished,
      author: post.author,
      url: `/blog/${post.slug}`,
    }),
    breadcrumbSchema([
      { name: 'Ana Sayfa', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: post.title, url: `/blog/${post.slug}` },
    ]),
  ];
  if (post.faq?.length) schemas.push(faqSchema(post.faq));

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <SEO
        title={post.title}
        description={post.description}
        image={post.image}
        type="article"
        jsonLd={schemas}
      />

      <nav className="text-xs text-slate-500 mb-4">
        <Link to="/" className="hover:text-[#DC2626]">{t('blog.home')}</Link>
        {' / '}
        <Link to="/blog" className="hover:text-[#DC2626]">{t('blog.breadcrumb')}</Link>
        {' / '}
        <span className="text-[var(--c-ink-soft)]">{post.category}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <span className="px-2 py-0.5 bg-red-50 text-[#DC2626] rounded-full font-medium">
            {post.category}
          </span>
          <span>·</span>
          <span>{t('blog.readingMinutes', { count: post.readingMinutes })}</span>
          <span>·</span>
          <time dateTime={post.datePublished}>
            {new Date(post.datePublished).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[var(--c-ink)] leading-[1.05]">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-slate-600">{post.excerpt}</p>
      </header>

      <div className="aspect-[16/9] bg-slate-100 rounded-2xl overflow-hidden mb-8">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
      </div>

      <div className="max-w-none text-[15px] leading-relaxed">{renderBody(post.body)}</div>

      {post.faq?.length ? (
        <section className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('blog.faqTitle')}</h2>
          <div className="space-y-4">
            {post.faq.map((f, i) => (
              <details key={i} className="bg-slate-50 rounded-xl p-4">
                <summary className="font-semibold text-slate-900 cursor-pointer">{f.question}</summary>
                <p className="mt-2 text-[var(--c-ink-soft)]">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-12 pt-8 border-t border-slate-200">
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map((t) => (
            <span key={t} className="text-xs px-3 py-1 bg-slate-100 text-[var(--c-ink-soft)] rounded-full">
              #{t}
            </span>
          ))}
        </div>

        {related.length > 0 && (
          <>
            <h3 className="text-xl font-bold text-slate-900 mb-4">{t('blog.relatedPosts')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-[#DC2626] transition"
                >
                  <div className="text-xs text-[#DC2626] font-medium">{r.category}</div>
                  <div className="mt-1 font-semibold text-slate-900 line-clamp-2">{r.title}</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </footer>
    </article>
  );
}
