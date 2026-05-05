import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, CheckCircle2, Phone, Mail, MapPin, Instagram, Facebook, Twitter, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { name: 'Büfe & Catering', image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', count: '1.200+ Ürün', path: '/kategori/bufe-catering' },
  { name: 'Market & Soğutma', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80', count: '850+ Ürün', path: '/kategori/market-sogutma' },
  { name: 'Pizza & Izgara', image: 'https://images.unsplash.com/photo-1593504049359-74330189a345?w=800&q=80', count: '640+ Ürün', path: '/kategori/pizza-izgara' },
  { name: 'Espresso Dünyası', image: 'https://images.unsplash.com/photo-1517701604599-bb26b58c88bb?w=800&q=80', count: '1.500+ Ürün', path: '/kategori/espresso-dunyasi' },
];

const PRODUCTS = [
  { id: 1, name: 'Elektro Nudelkoche', price: '3.532,00', category: 'Pişirme', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=80', path: '/product/1' },
  { id: 2, name: 'Gastro Fritteuse', price: '4.575,00', category: 'Kızartma', image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&q=80', path: '/product/2' },
  { id: 3, name: 'Aufsatz Gnocchi', price: '5.513,00', category: 'Hazırlama', image: 'https://images.unsplash.com/photo-1506484334402-40f215d89427?w=600&q=80', path: '/product/3' },
  { id: 4, name: 'Gärschrank für Öfen', price: '4.230,00', category: 'Soğutma', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80', path: '/product/4' },
];

export function Categories() {
  const navigate = useNavigate();
  return (
    <section className="py-32 bg-transparent text-white relative">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
             <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-5">
               <span className="w-6 h-px bg-brand-red" />
               KATEGORİ DÜNYALARI
             </span>
             <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter leading-[1.02] text-white">
               Ekipman <span className="text-brand-red italic font-light">keşfi.</span>
             </h2>
          </div>
          <button
            onClick={() => navigate('/kategori')}
            className="group inline-flex items-center gap-3 text-[10px] bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 px-7 py-3.5 rounded-full font-bold uppercase tracking-[0.25em] transition-all duration-300 self-start md:self-end shrink-0"
          >
            Tüm Kategoriler
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, idx) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              onClick={() => navigate(cat.path)}
              className="group relative h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5"
            >
              <img src={cat.image} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] ease-out opacity-90 group-hover:opacity-100" alt={cat.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/60 to-brand-dark/10" />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/0 to-brand-red/0 group-hover:from-brand-red/15 group-hover:to-transparent transition-colors duration-500" />
              
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <span className="text-[9px] font-bold tracking-[0.3em] text-white/50 uppercase mb-2 sm:mb-3 block">{cat.count}</span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4 sm:mb-6 uppercase tracking-tighter line-clamp-2">{cat.name}</h3>
                
                <div className="flex items-center gap-4 opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] relative">
                    İncele
                    <span className="absolute -bottom-1 left-0 w-full h-px bg-brand-red scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                  </span>
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
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
  return (
    <section className="py-32 bg-transparent text-white">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="text-center mb-20 flex flex-col items-center">
           <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-5">
             <span className="w-6 h-px bg-brand-red" />
             BESTSELLERS
             <span className="w-6 h-px bg-brand-red" />
           </span>
           <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter leading-[1.02] text-white">
             İmza <span className="text-brand-red italic font-light">koleksiyonu.</span>
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
              className="bg-[#0a0a0a]/80 backdrop-blur-md p-4 md:p-6 rounded-[2rem] border border-white/5 hover:border-brand-red/30 hover:bg-[#111]/90 shadow-2xl transition-all duration-500 group cursor-pointer"
            >
              <div className="relative aspect-square mb-8 overflow-hidden rounded-[1.5rem] bg-[#1a1a1a]">
                <img src={prod.image} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-95 group-hover:opacity-100" alt={prod.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">Bestseller</div>
              </div>
              <div className="px-2">
                <span className="text-[9px] font-bold text-brand-red uppercase tracking-[0.3em] block mb-3">{prod.category}</span>
                <h3 className="text-xl font-display font-bold mb-6 line-clamp-2 text-white/90">{prod.name}</h3>
                <div className="flex justify-between items-center pt-6 border-t border-white/10">
                  <span className="text-2xl font-display font-bold text-white tracking-tight">{prod.price} <span className="text-sm font-sans text-white/40">€</span></span>
                  <button className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full group-hover:bg-brand-red group-hover:border-brand-red transition-all duration-300">
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

export function Footer() {
  return (
    <footer className="bg-transparent text-white pt-32 pb-12 relative z-10 border-t border-white/5">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div>
            <div className="flex items-center gap-2 mb-8">
               <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center text-white font-bold text-xl">2</div>
               <div className="flex flex-col">
                 <span className="text-xl font-display font-bold leading-none tracking-tighter">MC GASTRO</span>
                 <span className="text-[8px] tracking-[0.2em] font-bold text-gray-400">PROFESSIONAL KITCHEN</span>
               </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              15 yılı aşkın tecrübemizle Avrupa'nın önde gelen restoran, otel ve catering işletmelerine profesyonel mutfak ekipmanları sunuyoruz.
            </p>
            <div className="flex gap-4">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-brand-red transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/10 pb-4">Hızlı Bağlantılar</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              {['Hakkımızda', 'Kariyer', 'İletişim', 'Ödeme Seçenekleri', 'Kargo & Teslimat', 'Bülten'].map(item => (
                <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/10 pb-4">Yardım Merkezi</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              {['Müşteri Destek', 'Garanti Koşulları', 'Kullanım Koşulları', 'Site Haritası', 'Künye', 'Cayma Hakkı'].map(item => (
                <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/10 pb-4">İletişim</h4>
            <ul className="space-y-6 text-sm text-gray-400">
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
                  <span>info@2mcgastro.com</span>
               </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
           <p className="text-[10px] text-gray-500 uppercase tracking-widest">© 2026 2MC Gastro GmbH. Tüm hakları saklıdır.</p>
           <div className="flex gap-8 text-[10px] text-gray-500 uppercase tracking-widest">
             <a href="#" className="hover:text-white">Gizlilik Politikası</a>
             <a href="#" className="hover:text-white">Çerezler</a>
             <a href="#" className="hover:text-white">Künye</a>
           </div>
        </div>
      </div>
    </footer>
  );
}
