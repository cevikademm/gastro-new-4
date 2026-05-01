import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Book, Ruler, Refrigerator, ClipboardList, PlayCircle, ChevronRight } from 'lucide-react';

const guides = [
  {
    id: 'getting-started',
    icon: Book,
    titleKey: 'docs.gettingStarted',
    content: `2MC Gastro platformuna hoş geldiniz! Bu kılavuz, platformun temel özelliklerini ve kullanımını anlatmaktadır.

**Hesap Oluşturma**: Kayıt sayfasından firma bilgilerinizi girerek hesabınızı oluşturun.

**İlk Proje**: Dashboard'dan "Yeni Proje" butonuna tıklayarak ilk projenizi başlatın. Proje adı, alan bilgisi ve müşteri detaylarını girin.

**Ekipman Seçimi**: Katalog sayfasından ihtiyacınız olan ekipmanları inceleyin, filtreleme ve arama özelliklerini kullanarak doğru ürünleri bulun.

**Tasarım**: Tasarım Stüdyosu'nda oda boyutlarını ayarlayın ve ekipmanları yerleştirin.

**Malzeme Listesi**: BOM sayfasından tüm malzemeleri görüntüleyin ve PDF/CSV olarak dışa aktarın.`,
  },
  {
    id: 'design',
    icon: Ruler,
    titleKey: 'docs.designGuide',
    content: `Tasarım Stüdyosu, mutfak planlarınızı oluşturmanız için güçlü bir araçtır.

**Oda Boyutları**: Sağ panelden uzunluk ve genişlik değerlerini metre cinsinden girin.

**Ekipman Yerleştirme**: Ekipman tepsisinden istediğiniz ekipmanı seçin ve çalışma alanına sürükleyin.

**Otomatik Hizalama**: Auto-Snap özelliği, ekipmanları otomatik olarak duvarlara ve diğer ekipmanlara hizalar.

**Kapı ve Pencere**: Oda planınıza kapı ve pencere ekleyerek gerçekçi bir düzen oluşturun.

**Enerji Hesaplama**: Platform, yerleştirdiğiniz ekipmanların toplam enerji tüketimini otomatik hesaplar.`,
  },
  {
    id: 'equipment',
    icon: Refrigerator,
    titleKey: 'docs.equipmentGuide',
    content: `Ekipman kataloğumuz, endüstriyel mutfak ekipmanlarının kapsamlı bir veritabanını içerir.

**Arama**: Üst kısımdaki arama çubuğundan model adı, ürün kodu veya açıklama ile arama yapabilirsiniz.

**Filtreleme**: Sol paneldeki filtreler ile seri (60er, 70er, 80er), ekipman türü ve güç özellikleri bazında filtreleme yapabilirsiniz.

**Teknik Detaylar**: Her ekipmanın boyutları, güç tüketimi ve teknik özellikleri detaylı olarak listelenmektedir.

**Plana Ekleme**: "Plana Ekle" butonu ile ekipmanı aktif projenize ekleyebilirsiniz.`,
  },
  {
    id: 'bom',
    icon: ClipboardList,
    titleKey: 'docs.bomGuide',
    content: `Malzeme Listesi (BOM), projeniz için gerekli tüm bileşen ve donanımları takip etmenizi sağlar.

**Görüntüleme**: BOM sayfasında tüm kalemler miktar, ürün kodu, tanım ve stok durumu ile listelenir.

**Arama/Filtreleme**: Üst kısımdaki filtre ile belirli ürün kodlarını arayabilirsiniz.

**Dışa Aktarma**: PDF ve CSV formatlarında dışa aktarım desteklenmektedir.

**Revizyon Takibi**: Onay geçmişi bölümünden proje revizyonlarını takip edebilirsiniz.`,
  },
];

export default function DocsPage() {
  const { t } = useTranslation();
  const [activeGuide, setActiveGuide] = useState('getting-started');

  const current = guides.find((g) => g.id === activeGuide)!;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{t('docs.title')}</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-72 flex lg:flex-col gap-2 overflow-x-auto">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <button
                key={guide.id}
                onClick={() => setActiveGuide(guide.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeGuide === guide.id ? 'bg-primary-fixed-dim/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon size={18} />
                {t(guide.titleKey)}
                {activeGuide === guide.id && <ChevronRight size={16} className="ml-auto hidden lg:block" />}
              </button>
            );
          })}
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high whitespace-nowrap">
            <PlayCircle size={18} /> {t('docs.videoTutorials')}
          </button>
        </div>

        <div className="flex-1 bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-6">
            <current.icon size={24} className="text-primary" />
            <h2 className="font-headline font-bold text-xl text-primary">{t(current.titleKey)}</h2>
          </div>
          <div className="prose prose-sm max-w-none">
            {current.content.split('\n\n').map((paragraph, i) => {
              if (paragraph.startsWith('**')) {
                const parts = paragraph.split('**');
                return (
                  <p key={i} className="text-on-surface leading-relaxed mb-4">
                    {parts.map((part, j) => (j % 2 === 1 ? <strong key={j} className="text-primary">{part}</strong> : part))}
                  </p>
                );
              }
              return <p key={i} className="text-on-surface leading-relaxed mb-4">{paragraph}</p>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
