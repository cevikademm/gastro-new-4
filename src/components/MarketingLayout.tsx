/**
 * MarketingLayout — SEO/landing sayfaları için hafif kabuk: AnnouncementBar +
 * Navbar + içerik + SiteFooter. Dashboard kenar çubuğu (Layout.tsx) YOK.
 * Kategori, ürün, marka, branche, şehir, ratgeber sayfaları bunu kullanır.
 */
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AnnouncementBar } from './landing/sections/AnnouncementBar';
import SiteFooter from './SiteFooter';

export default function MarketingLayout() {
  return (
    <div className="landing-page relative text-[#0F2440] bg-[#F4F5F7] min-h-screen selection:bg-brand-red selection:text-white">
      <AnnouncementBar />
      <Navbar />
      <main className="relative z-10 pt-[108px]">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

/** Ortak sayfa başlığı bloğu (breadcrumb + H1 + intro). */
export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2440] via-[#1E3A5F] to-[#0F2440]">
      <div className="absolute -top-20 -right-16 w-80 h-80 bg-brand-red/20 rounded-full blur-3xl" />
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {children}
        {eyebrow && <span className="inline-flex items-center gap-2 text-[color:var(--c-clay-soft)] font-bold text-[10px] tracking-[0.3em] uppercase mb-3">{eyebrow}</span>}
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-white leading-[1.05] max-w-4xl">{title}</h1>
        {intro && <p className="mt-4 text-sm md:text-base text-white/75 max-w-3xl leading-relaxed">{intro}</p>}
      </div>
    </section>
  );
}
