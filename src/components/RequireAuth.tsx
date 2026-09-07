/**
 * RequireAuth — üyelik gerektiren rotaların kapısı.
 *
 * NEDEN: Panel, projeler, çizim araçları, sepet/sipariş/teklif gibi rotalar
 * müşteri ve iş verisi okur. Giriş yapılmadan açıldıklarında hem veri sızma
 * yüzeyi oluşuyor hem de RLS yüzünden boş/yarım ekranlar çıkıyordu. Bu kapı
 * oturumsuz ziyaretçiyi giriş sayfasına gönderir ve GİTMEK İSTEDİĞİ ADRESİ
 * taşır; giriş sonrası oraya döner.
 *
 * KAPSAM DIŞI (bilerek herkese açık):
 *   • SEO sayfaları (/produkte, /produkt/:slug, /marke, /branche, /ratgeber,
 *     /vergleich, /blog, künye/gizlilik/AGB …) — indekslenmeleri gerekir.
 *   • İletişim ve bilgi sayfaları (/support, /docs, /resources,
 *     /tools/kitchen-calculator, /degisiklikler) — kamuya açık SEO
 *     sayfalarından bunlara bağlantı veriliyor.
 *
 * OTURUM YARIŞI: `isAuthenticated` localStorage'dan İYİMSER olarak geri
 * yüklenir, bu yüzden sayfa yenilemede girişli kullanıcı buraya takılmaz.
 * Google OAuth dönüşünde ise kaydedilmiş durum YOKTUR ve oturum doğrulaması
 * asenkron biter — bu yüzden `sessionChecked` tamamlanana kadar yönlendirme
 * yapılmaz, kısa bir yükleniyor ekranı gösterilir.
 */
import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionChecked = useAuthStore((s) => s.sessionChecked);
  const location = useLocation();

  if (isAuthenticated && user) return <>{children}</>;

  // Henüz bilmiyoruz (ilk oturum denetimi sürüyor) → yönlendirme YAPMA.
  if (!sessionChecked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 size={22} className="animate-spin text-on-surface-variant" />
      </div>
    );
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ from: `${location.pathname}${location.search}` }}
    />
  );
}
