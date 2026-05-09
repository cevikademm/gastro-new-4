import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readMin: number;
  image: string;
  href: string;
}

const POSTS: BlogPost[] = [
  {
    id: 'p1',
    title: 'Restoran Mutfağı Kurarken Yapılan 7 Pahalı Hata',
    excerpt: 'Yeni bir mutfak kurulumunda sık karşılaşılan hatalar ve profesyonel çözümleri.',
    category: 'Rehber',
    date: '2026-04-05',
    readMin: 8,
    image: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
    href: '/docs',
  },
  {
    id: 'p2',
    title: 'Kombi Fırın Nasıl Seçilir? Kapasite ve Enerji Rehberi',
    excerpt: 'İşletmeniz için doğru kombi fırın kapasitesini hesaplamanın pratik yolları.',
    category: 'Ürün Rehberi',
    date: '2026-03-28',
    readMin: 6,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
    href: '/docs',
  },
  {
    id: 'p3',
    title: 'HACCP Uyumlu Soğuk Zincir: Soğutma Ekipmanları',
    excerpt: 'Gıda güvenliği mevzuatına uygun soğutma sistemleri ve sertifikasyon.',
    category: 'Mevzuat',
    date: '2026-03-20',
    readMin: 10,
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
    href: '/docs',
  },
];

export default function BlogPreviewSection() {
  const { t } = useTranslation();

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(3);
  const [animate, setAnimate] = useState(true);
  const [dx, setDx] = useState(0);
  const [offsetPx, setOffsetPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ startX: 0, dx: 0, armed: false, dragging: false, pointerId: 0 });
  const wasDraggedRef = useRef(false);
  const total = POSTS.length;

  useEffect(() => {
    const calc = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(min-width: 768px)').matches) setVisible(3);
      else setVisible(1);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (dragRef.current.dragging) return;
      setAnimate(true);
      setIdx((i) => i + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (idx === total) {
      const t = setTimeout(() => {
        setAnimate(false);
        setIdx(0);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [idx, total]);

  useEffect(() => {
    if (!animate) {
      const t = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(t);
    }
  }, [animate]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { startX: e.clientX, dx: 0, armed: true, dragging: false, pointerId: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.armed) return;
    const d = e.clientX - dragRef.current.startX;
    if (!dragRef.current.dragging) {
      if (Math.abs(d) <= 5) return;
      dragRef.current.dragging = true;
      setDragging(true);
      setAnimate(false);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }
    dragRef.current.dx = d;
    setDx(d);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasDragging = dragRef.current.dragging;
    const d = dragRef.current.dx;
    dragRef.current = { startX: 0, dx: 0, armed: false, dragging: false, pointerId: 0 };
    if (!wasDragging) return;
    const w = containerRef.current?.clientWidth ?? 1;
    const cardW = w / visible;
    wasDraggedRef.current = Math.abs(d) > 5;
    setDragging(false);
    setDx(0);
    setOffsetPx((prev) => {
      let off = prev + d;
      let shift = 0;
      while (off <= -cardW) { shift += 1; off += cardW; }
      while (off >= cardW) { shift -= 1; off -= cardW; }
      if (shift !== 0) {
        setIdx((i) => {
          const raw = i + shift;
          const wrapped = ((raw % total) + total) % total;
          if (raw !== wrapped) {
            setAnimate(false);
            setTimeout(() => setAnimate(true), 50);
          }
          return wrapped;
        });
      }
      return off;
    });
    setAnimate(true);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (wasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDraggedRef.current = false;
    }
  };

  return (
    <section className="w-full max-w-6xl mt-10">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#DC2626] text-xs font-bold mb-2">
            <BookOpen size={12} /> {t('blog.badge', 'BLOG')}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t('blog.title', 'Sektör Rehberleri ve Makaleler')}
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            {t('blog.subtitle', 'Profesyonellerin hazırladığı içeriklerle işinizi büyütün.')}
          </p>
        </div>
        <a href="/blog" className="text-sm font-bold text-[#DC2626] hover:text-[#5a161b] flex items-center gap-1">
          {t('blog.viewAll', 'Tümünü Gör')} <ArrowRight size={14} />
        </a>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden touch-pan-y select-none"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(-${(idx * 100) / (total * 2)}% + ${offsetPx + dx}px))`,
            transition: animate ? 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            width: `${total * 2 * (100 / visible)}%`,
          }}
        >
          {[...POSTS, ...POSTS].map((post, i) => (
            <div
              key={`${post.id}-${i}`}
              style={{
                flex: `0 0 ${100 / (total * 2)}%`,
                padding: '0 10px',
              }}
            >
              <a
                href={`#${post.href}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 block"
              >
                <div className="aspect-video bg-slate-100 overflow-hidden relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    draggable={false}
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-[#DC2626] rounded-full uppercase tracking-wider">
                    {post.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-[#DC2626] transition">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(post.date).toLocaleDateString('tr-TR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {post.readMin} dk
                    </span>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
