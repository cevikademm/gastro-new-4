import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

export default function AGBPage() {
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['s1']);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const isGerman = i18n.language === 'de';

  const sections = isGerman ? [
    {
      id: 's1',
      num: '§1',
      title: 'Geltungsbereich',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für den Verkauf von Produkten und Dienstleistungen durch 2MC Gastro GmbH
            an Geschäftskunden (B2B). Diese AGB sind Grundlage für alle Rechtsgeschäfte zwischen dem Anbieter und dem Käufer.
          </p>
          <p>
            Abweichende Bedingungen des Käufers gelten nur, wenn sie vom Anbieter ausdrücklich schriftlich akzeptiert wurden.
          </p>
        </div>
      ),
    },
    {
      id: 's2',
      num: '§2',
      title: 'Vertragsschluss',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Die Präsentation von Produkten auf der Website stellt ein Angebot dar. Mit der Bestellung gibt der Käufer ein verbindliches Angebot ab.
          </p>
          <p>
            Der Vertrag kommt zustande durch die ausdrückliche Annahme des Angebots durch den Anbieter per E-Mail oder Bestätigungsschreiben.
            Die Annahme muss innerhalb von 14 Tagen nach Eingang der Bestellung erfolgen.
          </p>
          <p>
            Der Käufer kann seine Bestellung vor Vertragsschluss jederzeit durch schriftliche Mitteilung widerrufen.
          </p>
        </div>
      ),
    },
    {
      id: 's3',
      num: '§3',
      title: 'Preise und Zahlung',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Alle Preise sind Netto-Preise (ohne Mehrwertsteuer). Die Mehrwertsteuer wird bei der Rechnungsstellung separat hinzugefügt,
            entsprechend der zum Zeitpunkt der Lieferung geltenden gesetzlichen Steuersätze.
          </p>
          <p>
            <strong>Zahlungsbedingungen B2B:</strong>
            <br />- Netto-30: Zahlung innerhalb von 30 Tagen nach Rechnungsdatum
            <br />- Netto-60: Zahlung innerhalb von 60 Tagen nach Rechnungsdatum (auf Anfrage für Kunden mit Bonität)
            <br />- Vorkasse: Zahlung vor Versendung
          </p>
          <p>
            <strong>Skonto:</strong> Bei Zahlung innerhalb von 10 Tagen ab Rechnungsdatum gewähren wir 2% Skonto.
          </p>
          <p>
            Zahlungen erfolgen per SEPA-Überweisung, Kreditkarte oder Rechnung. Die Annahme von Zahlungsmitteln wird im Einzelfall bestätigt.
          </p>
        </div>
      ),
    },
    {
      id: 's4',
      num: '§4',
      title: 'Lieferung und Versand',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Liefermethoden:</strong>
            <br />- Paketdienst (DHL, DPD, UPS) für kleine Geräte
            <br />- Spedition für große Geräte (Entladung auf Anfrage)
            <br />- Selbstabholung nach Vereinbarung
          </p>
          <p>
            <strong>Liefergebiet:</strong> Deutschland, Österreich, Niederlande, Belgien, Frankreich und alle EU-Länder.
          </p>
          <p>
            <strong>Lieferzeiten:</strong> Standard 5-10 Werktage. Express-Optionen verfügbar.
          </p>
          <p>
            Der Anbieter behält sich das Recht vor, bei nicht verfügbaren Waren Teillieferungen durchzuführen.
          </p>
          <p>
            Gefahrübergang: Bei Geschäftskunden erfolgt der Gefahrübergang mit Übergabe an den Frachtführer.
          </p>
        </div>
      ),
    },
    {
      id: 's5',
      num: '§5',
      title: 'Eigentumsvorbehalt',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Bis zur vollständigen Bezahlung aller ausstehenden Rechnungen behält der Anbieter das Eigentum an den gelieferten Waren.
            Der Käufer darf die Ware nur im gewöhnlichen Geschäftsbetrieb weitergeben.
          </p>
        </div>
      ),
    },
    {
      id: 's6',
      num: '§6',
      title: 'Gewährleistung',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Gewährleistungsfrist für B2B:</strong> 1 Jahr nach Lieferung.
          </p>
          <p>
            Mängel müssen dem Anbieter unverzüglich, spätestens 10 Tage nach Lieferung, schriftlich angezeigt werden.
            Nicht rechtzeitig angezeigte Mängel führen zum Ausschluss der Gewährleistungsrechte.
          </p>
          <p>
            Der Anbieter leistet Gewährleistung durch Nachbesserung oder Ersatzlieferung nach eigener Wahl.
          </p>
          <p>
            <strong>Ausschluss:</strong> Garantie besteht nicht für Verschleiß, normale Abnutzung, unsachgemäße Verwendung oder
            Installation durch den Käufer oder Dritte.
          </p>
        </div>
      ),
    },
    {
      id: 's7',
      num: '§7',
      title: 'Haftung',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Der Anbieter haftet im Rahmen der Produkthaftung unbegrenzt für Schäden aus Todesfällen, Körperverletzungen oder
            Gesundheitsschäden sowie für Schäden durch Vorsatz oder grobe Fahrlässigkeit.
          </p>
          <p>
            Für Schäden, die nicht oben genannt sind, haftet der Anbieter nur bei Vorsatz oder grober Fahrlässigkeit und höchstens
            in Höhe des Warenwerts der betroffenen Ware.
          </p>
          <p>
            Der Anbieter haftet nicht für entgangene Gewinne oder andere Folgeschäden.
          </p>
        </div>
      ),
    },
    {
      id: 's8',
      num: '§8',
      title: 'Datenschutz',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer <a href="/datenschutz" className="text-primary hover:underline">Datenschutzrichtlinie</a>.
          </p>
          <p>
            Der Käufer erklärt sich damit einverstanden, dass seine Daten zum Zweck der Vertragserfüllung, Rechnungslegung und
            Kundenservice verarbeitet werden.
          </p>
        </div>
      ),
    },
    {
      id: 's9',
      num: '§9',
      title: 'Schlussbestimmungen',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Rechtswahl:</strong> Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
          </p>
          <p>
            <strong>Gerichtsstand:</strong> Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist Köln, Deutschland, soweit der Käufer
            selbst nicht Verbraucher ist.
          </p>
          <p>
            <strong>Salvatorische Klausel:</strong> Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen unberührt.
          </p>
          <p>
            <strong>Änderungen:</strong> Der Anbieter behält sich das Recht vor, diese AGB zu ändern. Änderungen treten nur für zukünftige Verträge
            in Kraft und werden dem Käufer vorher mitgeteilt.
          </p>
        </div>
      ),
    },
  ] : i18n.language === 'en' ? [
    {
      id: 's1',
      num: '§1',
      title: 'Scope',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            These General Terms and Conditions (GTC) apply to the sale of products and services by 2MC Gastro GmbH
            to business customers (B2B). These GTC form the basis for all legal transactions between the provider and the buyer.
          </p>
          <p>
            Deviating conditions of the buyer apply only if they have been expressly accepted in writing by the provider.
          </p>
        </div>
      ),
    },
    {
      id: 's2',
      num: '§2',
      title: 'Contract Formation',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            The presentation of products on the website constitutes an offer. By placing an order, the buyer makes a binding offer.
          </p>
          <p>
            The contract is concluded by explicit acceptance of the offer by the provider via email or confirmation letter.
            Acceptance must occur within 14 days of receipt of the order.
          </p>
          <p>
            The buyer can withdraw his order at any time before the contract is concluded by written notice.
          </p>
        </div>
      ),
    },
    {
      id: 's3',
      num: '§3',
      title: 'Prices and Payment',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            All prices are net prices (excluding value-added tax). VAT is added separately upon invoicing,
            in accordance with the applicable statutory tax rates at the time of delivery.
          </p>
          <p>
            <strong>Payment Terms B2B:</strong>
            <br />- Net-30: Payment within 30 days of invoice date
            <br />- Net-60: Payment within 60 days of invoice date (on request for customers with creditworthiness)
            <br />- Prepayment: Payment before shipment
          </p>
          <p>
            <strong>Discount:</strong> We grant 2% discount if payment is made within 10 days of invoice date.
          </p>
          <p>
            Payments are made via SEPA transfer, credit card, or invoice. The acceptance of payment methods is confirmed on a case-by-case basis.
          </p>
        </div>
      ),
    },
    {
      id: 's4',
      num: '§4',
      title: 'Delivery and Shipping',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Shipping Methods:</strong>
            <br />- Parcel service (DHL, DPD, UPS) for small equipment
            <br />- Freight forwarding for large equipment (unloading on request)
            <br />- Pickup by arrangement
          </p>
          <p>
            <strong>Delivery Area:</strong> Germany, Austria, Netherlands, Belgium, France and all EU countries.
          </p>
          <p>
            <strong>Delivery Times:</strong> Standard 5-10 business days. Express options available.
          </p>
          <p>
            The provider reserves the right to make partial shipments if goods are unavailable.
          </p>
          <p>
            Risk of loss: For business customers, the risk of loss transfers upon handover to the carrier.
          </p>
        </div>
      ),
    },
    {
      id: 's5',
      num: '§5',
      title: 'Retention of Title',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Until full payment of all outstanding invoices, the provider retains ownership of the delivered goods.
            The buyer may only pass on the goods in the ordinary course of business.
          </p>
        </div>
      ),
    },
    {
      id: 's6',
      num: '§6',
      title: 'Warranty',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Warranty Period for B2B:</strong> 1 year after delivery.
          </p>
          <p>
            Defects must be reported to the provider immediately, no later than 10 days after delivery, in writing.
            Defects not reported in time result in loss of warranty rights.
          </p>
          <p>
            The provider provides warranty by repair or replacement at its discretion.
          </p>
          <p>
            <strong>Exclusion:</strong> Warranty does not apply to wear and tear, normal use, misuse, or
            installation by the buyer or third parties.
          </p>
        </div>
      ),
    },
    {
      id: 's7',
      num: '§7',
      title: 'Liability',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            The provider is liable without limitation under product liability for damages arising from deaths, bodily injury or
            health damage as well as for damages caused by intent or gross negligence.
          </p>
          <p>
            For damages not mentioned above, the provider is liable only for intent or gross negligence and at most
            in the amount of the value of the affected goods.
          </p>
          <p>
            The provider is not liable for lost profits or other consequential damages.
          </p>
        </div>
      ),
    },
    {
      id: 's8',
      num: '§8',
      title: 'Data Protection',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Personal data processing is carried out in accordance with our <a href="/datenschutz" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
          <p>
            The buyer consents to his data being processed for the purpose of contract fulfillment, invoicing, and
            customer service.
          </p>
        </div>
      ),
    },
    {
      id: 's9',
      num: '§9',
      title: 'Final Provisions',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Governing Law:</strong> German law exclusively applies, excluding the UN Convention on Contracts for the International Sale of Goods.
          </p>
          <p>
            <strong>Jurisdiction:</strong> The place of jurisdiction for all disputes arising from this contract is Cologne, Germany,
            insofar as the buyer is not a consumer.
          </p>
          <p>
            <strong>Severability Clause:</strong> Should any provision of these GTC be invalid, the validity of the remaining provisions remains unaffected.
          </p>
          <p>
            <strong>Changes:</strong> The provider reserves the right to change these GTC. Changes apply only to future contracts
            and are communicated to the buyer beforehand.
          </p>
        </div>
      ),
    },
  ] : [
    {
      id: 's1',
      num: '§1',
      title: 'Kapsam',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Bu Genel Ticari Şartlar (GTS), 2MC Gastro GmbH tarafından ticari müşterilere (B2B) ürün ve hizmetlerin satışı için geçerlidir.
            Bu GTS, sağlayıcı ve alıcı arasındaki tüm yasal işlemlerin temelini oluşturur.
          </p>
          <p>
            Alıcının farklı şartları ancak sağlayıcı tarafından açıkça yazılı olarak kabul edilmişse geçerlidir.
          </p>
        </div>
      ),
    },
    {
      id: 's2',
      num: '§2',
      title: 'Sözleşme Yapılması',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Web sitesinde ürünlerin sunulması bir teklif oluşturur. Sipariş vererek, alıcı bağlayıcı bir teklif yapmış olur.
          </p>
          <p>
            Sözleşme, sağlayıcı tarafından e-posta veya onay mektubu yoluyla açık kabul ile imzalanır.
            Kabul, siparişin alınmasından sonra 14 gün içinde gerçekleşmelidir.
          </p>
          <p>
            Alıcı, sözleşme yapılmadan önce yazılı bildirim yoluyla siparişini istediği zaman iptal edebilir.
          </p>
        </div>
      ),
    },
    {
      id: 's3',
      num: '§3',
      title: 'Fiyatlar ve Ödeme',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Tüm fiyatlar net fiyatlardır (katma değer vergisi hariç). KDV faturalama sırasında ayrı olarak eklenir,
            teslimat sırasında geçerli olan yasal vergi oranlarına uygun olarak.
          </p>
          <p>
            <strong>B2B Ödeme Şartları:</strong>
            <br />- Net-30: Fatura tarihinden itibaren 30 gün içinde ödeme
            <br />- Net-60: Fatura tarihinden itibaren 60 gün içinde ödeme (kredi değeri olan müşteriler için talep üzerine)
            <br />- Ön ödeme: Kargo göndermeden önce ödeme
          </p>
          <p>
            <strong>İskonto:</strong> Fatura tarihinden itibaren 10 gün içinde ödeme yapılırsa %2 indirim verilir.
          </p>
          <p>
            Ödemeler SEPA havalesi, kredi kartı veya fatura yoluyla yapılır. Ödeme yöntemlerinin kabulü durum bazında onaylanır.
          </p>
        </div>
      ),
    },
    {
      id: 's4',
      num: '§4',
      title: 'Teslimat ve Kargo',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Kargo Yöntemleri:</strong>
            <br />- Küçük ekipman için kuryeler (DHL, DPD, UPS)
            <br />- Büyük ekipman için kargo taşımacılığı (boşaltma talep üzerine)
            <br />- Kendi aracılığıyla teslim alma
          </p>
          <p>
            <strong>Teslimat Bölgesi:</strong> Almanya, Avusturya, Hollanda, Belçika, Fransa ve tüm AB ülkeleri.
          </p>
          <p>
            <strong>Teslimat Süreleri:</strong> Standart 5-10 iş günü. Express seçenekleri mevcuttur.
          </p>
          <p>
            Sağlayıcı, mallar mevcut değilse kısmi gönderim yapma hakkını saklı tutar.
          </p>
          <p>
            Kayıp riski: Ticari müşteriler için, kayıp riski taşıyıcıya teslim ile devredilir.
          </p>
        </div>
      ),
    },
    {
      id: 's5',
      num: '§5',
      title: 'Mülkiyet Rezervi',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Tüm ödenmemiş faturaların tamamen ödenmesine kadar, sağlayıcı teslim edilen malların mülkiyetini saklı tutar.
            Alıcı, malları yalnızca işletmenin olağan akışında geçirebilir.
          </p>
        </div>
      ),
    },
    {
      id: 's6',
      num: '§6',
      title: 'Garanti',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>B2B için Garanti Süresi:</strong> Teslimatdan sonra 1 yıl.
          </p>
          <p>
            Kusurlar derhal, teslimatdan en geç 10 gün sonra yazılı olarak sağlayıcıya bildirilmelidir.
            Zamanında bildirilmeyen kusurlar, garanti haklarının kaybına neden olur.
          </p>
          <p>
            Sağlayıcı, kendi kararı doğrultusunda onarım veya değişim yoluyla garanti sağlar.
          </p>
          <p>
            <strong>Hariç Tutulma:</strong> Garanti, aşınma, normal kullanım, yanlış kullanım veya
            alıcı veya üçüncü şahıslar tarafından kuruluma uygulanmaz.
          </p>
        </div>
      ),
    },
    {
      id: 's7',
      num: '§7',
      title: 'Sorumluluk',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Sağlayıcı, ölümler, vücut yaralanmaları veya sağlık zararlarından kaynaklanan zararlar ile
            kasıt veya ağır ihmale neden olan zararlar için sınırsız sorumludur.
          </p>
          <p>
            Yukarıda belirtilmeyen zararlar için, sağlayıcı yalnızca kasıt veya ağır ihmal için sorumlu ve
            etkilenen malın değeri tutarında sorumludur.
          </p>
          <p>
            Sağlayıcı, entâr kaybı veya diğer dolaylı zararlar için sorumlu değildir.
          </p>
        </div>
      ),
    },
    {
      id: 's8',
      num: '§8',
      title: 'Veri Koruma',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Kişisel verilerin işlenmesi <a href="/datenschutz" className="text-primary hover:underline">Gizlilik Politikamız</a> uyarınca yapılır.
          </p>
          <p>
            Alıcı, verilerinin sözleşme yerine getirilme, faturalandırma ve
            müşteri hizmetleri amacıyla işlenmesine izin verir.
          </p>
        </div>
      ),
    },
    {
      id: 's9',
      num: '§9',
      title: 'Son Hükümler',
      content: (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong>Uygulanacak Hukuk:</strong> Uluslararası Ticari Mal Satışı Sözleşmesine ilişkin BM Sözleşmesi hariç olmak üzere yalnızca Alman hukuku uygulanır.
          </p>
          <p>
            <strong>Yetki:</strong> Bu sözleşmeden kaynaklanan tüm uyuşmazlıklar için yetki, alıcı tüketici olmadığı sürece Köln, Almanya'dadır.
          </p>
          <p>
            <strong>Kurtarma Koşulu:</strong> Bu GTS'nin herhangi bir hükmü geçersiz olursa, geri kalan hükümlerin geçerliliği etkilenmez.
          </p>
          <p>
            <strong>Değişiklikler:</strong> Sağlayıcı bu GTS'yi değiştirme hakkını saklı tutar. Değişiklikler yalnızca gelecekteki sözleşmelere uygulanır
            ve alıcıya önceden bildirilir.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface font-headline mb-4">
            {isGerman ? 'Allgemeine Geschäftsbedingungen (AGB)' : i18n.language === 'en' ? 'Terms and Conditions' : 'Genel Ticari Şartlar'}
          </h1>
          <p className="text-sm text-on-surface-variant mb-4">
            {isGerman ? 'B2B Geschäftskunden · Professionelle Küchengeräte' : i18n.language === 'en' ? 'B2B Business Customers · Professional Kitchen Equipment' : 'B2B İşletme Müşterileri · Profesyonel Mutfak Ekipmanı'}
          </p>
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
                <div className="text-left">
                  <span className="inline-block w-12 font-bold text-primary">{section.num}</span>
                  <span className="font-bold text-on-surface">{section.title}</span>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-on-surface-variant transition-transform flex-shrink-0 ${
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
