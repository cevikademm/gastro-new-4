import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Phone, Mail, MapPin, Instagram, Facebook, Twitter, Youtube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  { nameKey: 'landing.sections.catBufe', image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', count: 1200, path: '/kategori/bufe-catering' },
  { nameKey: 'landing.sections.catMarket', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80', count: 850, path: '/kategori/market-sogutma' },
  { nameKey: 'landing.sections.catPizza', image: 'https://images.unsplash.com/photo-1593504049359-74330189a345?w=800&q=80', count: 640, path: '/kategori/pizza-izgara' },
  { nameKey: 'landing.sections.catEspresso', image: 'https://images.unsplash.com/photo-1517701604599-bb26b58c88bb?w=800&q=80', count: 1500, path: '/kategori/espresso-dunyasi' },
];

const PRODUCTS = [
  { id: 1, name: 'Elektro Nudelkoche', price: '3.532,00', categoryKey: 'landing.sections.catCooking', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=80', path: '/product/1' },
  { id: 2, name: 'Gastro Fritteuse', price: '4.575,00', categoryKey: 'landing.sections.catFrying', image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&q=80', path: '/product/2' },
  { id: 3, name: 'Aufsatz Gnocchi', price: '5.513,00', categoryKey: 'landing.sections.catPrep', image: 'https://images.unsplash.com/photo-1506484334402-40f215d89427?w=600&q=80', path: '/product/3' },
  { id: 4, name: 'Gärschrank für Öfen', price: '4.230,00', categoryKey: 'landing.sections.catCooling', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80', path: '/product/4' },
];

export function Categories() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="py-32 bg-white text-[#0F2440] relative">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-5">
              <span className="w-6 h-px bg-brand-red" />
              {t('landing.sections.categoriesEyebrow')}
            </span>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter leading-[1.02] text-[#0F2440]">
              {t('landing.sections.equipmentWord')} <span className="text-brand-red italic font-light">{t('landing.sections.discoverWord')}</span>
            </h2>
          </div>
          <button
            onClick={() => navigate('/kategori')}
            className="group inline-flex items-center gap-3 text-[10px] bg-white border border-slate-300 hover:border-brand-red hover:text-brand-red text-[#0F2440] px-7 py-3.5 rounded-full font-bold uppercase tracking-[0.25em] transition-all duration-300 self-start md:self-end shrink-0 cursor-pointer"
          >
            {t('landing.sections.allCategories')}
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, idx) => (
            <motion.div
              key={cat.nameKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              onClick={() => navigate(cat.path)}
              className="group relative h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer shadow-[0_18px_40px_-16px_rgba(15,36,64,0.25)] border border-slate-200 hover:border-brand-red/40 transition-colors duration-500"
            >
              <img src={cat.image} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] ease-out" alt={t(cat.nameKey)} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F2440]/85 via-[#0F2440]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/0 to-brand-red/0 group-hover:from-brand-red/30 group-hover:to-transparent transition-colors duration-500" />

              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <span className="text-[9px] font-bold tracking-[0.3em] text-white/80 uppercase mb-2 sm:mb-3 block">{t('landing.sections.productCount', { count: cat.count.toLocaleString('de-DE') })}</span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4 sm:mb-6 uppercase tracking-tighter line-clamp-2">{t(cat.nameKey)}</h3>

                <div className="flex items-center gap-4 opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] relative">
                    {t('common.explore')}
                    <span className="absolute -bottom-1 left-0 w-full h-px bg-brand-red scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                  </span>
                  <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                    <ChevronRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedProducts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="py-32 bg-[#FAFAFA] text-[#0F2440]">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="text-center mb-20 flex flex-col items-center">
          <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-5">
            <span className="w-6 h-px bg-brand-red" />
            BESTSELLERS
            <span className="w-6 h-px bg-brand-red" />
          </span>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter leading-[1.02] text-[#0F2440]">
            {t('landing.sections.signatureWord')} <span className="text-brand-red italic font-light">{t('landing.sections.collectionWord')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PRODUCTS.map((prod, idx) => (
            <motion.div
              key={prod.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              onClick={() => navigate(prod.path)}
              className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-200 hover:border-brand-red/40 hover:shadow-[0_24px_50px_-16px_rgba(220,38,38,0.18)] shadow-[0_4px_16px_rgba(15,36,64,0.06)] transition-all duration-500 group cursor-pointer"
            >
              <div className="relative aspect-square mb-8 overflow-hidden rounded-[1.5rem] bg-slate-100">
                <img src={prod.image} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" alt={prod.name} />
                <div className="absolute top-4 left-4 bg-brand-red text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.35)]">Bestseller</div>
              </div>
              <div className="px-2">
                <span className="text-[9px] font-bold text-brand-red uppercase tracking-[0.3em] block mb-3">{t(prod.categoryKey)}</span>
                <h3 className="text-xl font-display font-bold mb-6 line-clamp-2 text-[#0F2440]">{prod.name}</h3>
                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <span className="text-2xl font-display font-bold text-[#0F2440] tracking-tight">{prod.price} <span className="text-sm font-sans text-slate-400">€</span></span>
                  <button className="w-12 h-12 flex items-center justify-center bg-slate-100 border border-slate-200 text-[#0F2440] rounded-full group-hover:bg-brand-red group-hover:border-brand-red group-hover:text-white transition-all duration-300 cursor-pointer">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FOOTER_QUICK_LINKS = [
  'landing.footer.links.about',
  'landing.footer.links.career',
  'landing.footer.links.contact',
  'landing.footer.links.paymentOptions',
  'landing.footer.links.shipping',
  'landing.footer.links.newsletter',
];

const FOOTER_HELP_LINKS = [
  'landing.footer.helpLinks.support',
  'landing.footer.helpLinks.warranty',
  'landing.footer.helpLinks.terms',
  'landing.footer.helpLinks.sitemap',
  'landing.footer.imprint',
  'landing.footer.helpLinks.cancellation',
];

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#0F2440] text-white pt-32 pb-12 relative z-10">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center text-white font-bold text-xl shadow-[0_8px_20px_-4px_rgba(220,38,38,0.5)]">2</div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold leading-none tracking-tighter">MC GASTRO</span>
                <span className="text-[8px] tracking-[0.2em] font-bold text-white/50">PROFESSIONAL KITCHEN</span>
              </div>
            </div>
            <p className="text-white/65 text-sm leading-relaxed mb-8">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex gap-4">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-red transition-colors cursor-pointer">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/15 pb-4">{t('landing.footer.quickLinksHeading', 'Hızlı Bağlantılar')}</h4>
            <ul className="space-y-4 text-sm text-white/65">
              {FOOTER_QUICK_LINKS.map(key => (
                <li key={key}><a href="#" className="hover:text-brand-red transition-colors">{t(key)}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/15 pb-4">{t('landing.footer.helpCenterHeading', 'Yardım Merkezi')}</h4>
            <ul className="space-y-4 text-sm text-white/65">
              {FOOTER_HELP_LINKS.map(key => (
                <li key={key}><a href="#" className="hover:text-brand-red transition-colors">{t(key)}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/15 pb-4">{t('landing.footer.contactHeading', 'İletişim')}</h4>
            <ul className="space-y-6 text-sm text-white/65">
              <li className="flex gap-4">
                <MapPin className="w-5 h-5 text-brand-red shrink-0" />
                <span>5. Köln, Almanya<br />İstanbul, Türkiye</span>
              </li>
              <li className="flex gap-4">
                <Phone className="w-5 h-5 text-brand-red shrink-0" />
                <span>+49 (0) 221 1234 5678<br />+90 (212) 123 45 67</span>
              </li>
              <li className="flex gap-4">
                <Mail className="w-5 h-5 text-brand-red shrink-0" />
                <span>info@2mcgastro.de</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] text-white/50 uppercase tracking-widest">{t('landing.footer.copyright', '© {{year}} 2MC Gastro GmbH. Tüm hakları saklıdır.', { year: new Date().getFullYear() })}</p>
          <div className="flex gap-8 text-[10px] text-white/50 uppercase tracking-widest">
            <a href="#" className="hover:text-brand-red transition-colors">{t('landing.footer.privacyPolicy', 'Gizlilik Politikası')}</a>
            <a href="#" className="hover:text-brand-red transition-colors">{t('landing.footer.cookies', 'Çerezler')}</a>
            <a href="#" className="hover:text-brand-red transition-colors">{t('landing.footer.imprint', 'Künye')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
