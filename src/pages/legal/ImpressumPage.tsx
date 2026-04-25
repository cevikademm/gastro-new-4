import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

export default function ImpressumPage() {
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const isGerman = i18n.language === 'de';

  const sections = [
    {
      id: 'company',
      title: isGerman ? 'Angaben zum Unternehmen' : 'Company Information',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p><strong>Firmenname:</strong> 2MC Gastro GmbH</p>
          <p><strong>Geschäftsführer:</strong> [Name Geschäftsführer]</p>
          <p><strong>Adresse:</strong><br />[Straße und Hausnummer]<br />[PLZ Stadt]<br />Deutschland</p>
          <p><strong>Handelsregister:</strong> HRB XXXXX, Amtsgericht [Stadt]</p>
          <p><strong>USt-IdNr.:</strong> DE XXXXXXXXX</p>
          <p><strong>E-Mail:</strong> <a href="mailto:info@2mcgastro.com" className="text-primary hover:underline">info@2mcgastro.com</a></p>
          <p><strong>Telefon:</strong> +49 (0) 221 1234 5678</p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p><strong>Company Name:</strong> 2MC Gastro GmbH</p>
          <p><strong>Managing Director:</strong> [Managing Director Name]</p>
          <p><strong>Address:</strong><br />[Street and House Number]<br />[Postal Code City]<br />Germany</p>
          <p><strong>Trade Register:</strong> HRB XXXXX, District Court [City]</p>
          <p><strong>VAT ID:</strong> DE XXXXXXXXX</p>
          <p><strong>Email:</strong> <a href="mailto:info@2mcgastro.com" className="text-primary hover:underline">info@2mcgastro.com</a></p>
          <p><strong>Phone:</strong> +49 (0) 221 1234 5678</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p><strong>Şirket Adı:</strong> 2MC Gastro GmbH</p>
          <p><strong>Müdür:</strong> [Müdür Adı]</p>
          <p><strong>Adres:</strong><br />[Cadde ve Ev Numarası]<br />[Posta Kodu Şehir]<br />Almanya</p>
          <p><strong>Ticaret Sicili:</strong> HRB XXXXX, Ağır Ceza Mahkemesi [Şehir]</p>
          <p><strong>KDV No.:</strong> DE XXXXXXXXX</p>
          <p><strong>E-posta:</strong> <a href="mailto:info@2mcgastro.com" className="text-primary hover:underline">info@2mcgastro.com</a></p>
          <p><strong>Telefon:</strong> +49 (0) 221 1234 5678</p>
        </div>
      ),
    },
    {
      id: 'responsible',
      title: isGerman ? 'Verantwortlicher für Inhalte' : 'Responsible for Content',
      content: isGerman ? (
        <p className="text-sm text-on-surface-variant">
          Gemäß § 18 Abs. 2 MStV ist der Anbieter für den Inhalt dieser Website nach deutschem Medienrecht verantwortlich.
          Verantwortliche Stelle: 2MC Gastro GmbH, vertreten durch [Name Geschäftsführer], [Adresse].
        </p>
      ) : i18n.language === 'en' ? (
        <p className="text-sm text-on-surface-variant">
          According to § 18 Abs. 2 MStV, the provider is responsible for the content of this website according to German media law.
          Responsible party: 2MC Gastro GmbH, represented by [Managing Director Name], [Address].
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Alman medya yasasına göre, sağlayıcı bu web sitesinin içeriğinden sorumludur.
          Sorumlu taraf: 2MC Gastro GmbH, [Müdür Adı] tarafından temsil edilen, [Adres].
        </p>
      ),
    },
    {
      id: 'dispute',
      title: isGerman ? 'Streitschlichtung' : 'Dispute Resolution',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungs-Plattform (OSP) der Europäischen Kommission zu richten:</p>
          <p><a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
          <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>Consumers have the opportunity to submit complaints to the European Commission's Online Dispute Resolution (ODR) platform:</p>
          <p><a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
          <p>We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer mediation body.</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>Tüketiciler, Avrupa Komisyonu'nun Çevrimiçi Uyuşmazlık Çözüm (ODR) platformuna şikayetler sunma fırsatına sahiptir:</p>
          <p><a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
          <p>Uyuşmazlık çözüm prosedürlerine katılmaya istekli değiliz ve yükümlü değiliz.</p>
        </div>
      ),
    },
    {
      id: 'disclaimer',
      title: isGerman ? 'Haftungsausschluss' : 'Disclaimer',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
            Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
          <p>
            Die auf dieser Website bereitgestellten Informationen werden ohne Gewährleistung für Richtigkeit oder Vollständigkeit bereitgestellt.
            Wir haften nicht für Schäden, die durch die Nutzung oder Nichtnutzung dieser Website oder ihrer Inhalte entstehen.
          </p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            Despite careful content monitoring, we assume no liability for the contents of external links.
            The operators of the linked pages are solely responsible for their content.
          </p>
          <p>
            The information provided on this website is provided without warranty of accuracy or completeness.
            We are not liable for damages arising from the use or non-use of this website or its contents.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            Dikkatli içerik denetimesine rağmen, harici bağlantıların içeriğinden sorumlu değiliz.
            Bağlantılı sayfaların işletmeleri yalnızca kendi içeriklerinden sorumludur.
          </p>
          <p>
            Bu web sitesinde sağlanan bilgiler doğruluk veya tamlık garantisi olmaksızın sağlanır.
            Bu web sitesinin veya içeriğinin kullanılması veya kullanılmamasından kaynaklanan hasarlardan sorumlu değiliz.
          </p>
        </div>
      ),
    },
    {
      id: 'copyright',
      title: isGerman ? 'Urheberrecht' : 'Copyright',
      content: isGerman ? (
        <p className="text-sm text-on-surface-variant">
          Der Inhalt dieser Website ist urheberrechtlich geschützt. Alle Inhalte, einschließlich Text, Grafiken, Logos und Bilder,
          sind das Eigentum von 2MC Gastro GmbH oder der jeweiligen Eigentümer und dürfen ohne ausdrückliche Genehmigung
          nicht reproduziert, verteilt oder übertragen werden.
        </p>
      ) : i18n.language === 'en' ? (
        <p className="text-sm text-on-surface-variant">
          The content on this website is protected by copyright. All content, including text, graphics, logos, and images,
          is owned by 2MC Gastro GmbH or the respective owners and may not be reproduced, distributed, or transmitted
          without express permission.
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Bu web sitesinin içeriği telif hakkı tarafından korunmaktadır. Metin, grafikler, logolar ve resimler de dahil olmak üzere tüm içerik,
          2MC Gastro GmbH'nin veya ilgili sahiplerinin mülkiyetindedir ve açık izin olmaksızın çoğaltılamaz, dağıtılamaz veya iletilemez.
        </p>
      ),
    },
    {
      id: 'privacy',
      title: isGerman ? 'Datenschutz' : 'Data Protection',
      content: isGerman ? (
        <p className="text-sm text-on-surface-variant">
          Informationen zum Schutz Ihrer persönlichen Daten finden Sie in unserer <a href="/datenschutz" className="text-primary hover:underline">Datenschutzrichtlinie</a>.
        </p>
      ) : i18n.language === 'en' ? (
        <p className="text-sm text-on-surface-variant">
          Information on protecting your personal data can be found in our <a href="/datenschutz" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Kişisel verilerinizin korunması hakkında bilgiler, <a href="/datenschutz" className="text-primary hover:underline">Gizlilik Politikamızda</a> bulunabilir.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface font-headline mb-4">
            {isGerman ? 'Impressum' : i18n.language === 'en' ? 'Legal Notice' : 'Hukuki Uyarı'}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {isGerman ? 'Aktualisiert' : i18n.language === 'en' ? 'Updated' : 'Güncellendi'} {new Date().toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="border border-outline-variant/30 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors"
              >
                <h2 className="text-lg font-bold text-on-surface text-left">{section.title}</h2>
                <ChevronDown
                  size={20}
                  className={`text-on-surface-variant transition-transform ${
                    expandedSections.includes(section.id) ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.includes(section.id) && (
                <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back to top button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-12 inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-70 transition-opacity"
        >
          ↑ {isGerman ? 'Nach oben' : i18n.language === 'en' ? 'Back to top' : 'Üste git'}
        </button>
      </div>
    </div>
  );
}
