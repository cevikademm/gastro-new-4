import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Download } from 'lucide-react';

export default function WiderrufsbelehrungPage() {
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
      id: 'right',
      title: isGerman ? 'Widerrufsrecht' : 'Withdrawal Right',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            <strong>Widerrufsrecht für Verbraucher:</strong> Sie haben das Recht, einen mit uns geschlossenen Vertrag zur Lieferung von Waren innerhalb von 14 Tagen ohne Angabe von Gründen zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter (nicht der Beförderer) die Waren in Besitz genommen haben.
          </p>
          <p>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns per E-Mail, Brief, Telefonanruf oder Fax mittels einer eindeutigen Erklärung benachrichtigen, dass Sie diesen Vertrag widerrufen möchten. Sie können das beigefügte Muster-Widerrufsformular verwenden, müssen dies aber nicht.
          </p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            <strong>Right of Withdrawal for Consumers:</strong> You have the right to withdraw from any contract for the supply of goods within 14 days without stating a reason. The withdrawal period is 14 days from the day on which you or a third party designated by you (not the carrier) took possession of the goods.
          </p>
          <p>
            To exercise your withdrawal right, you must notify us by email, letter, telephone call, or fax by means of an unambiguous statement that you wish to withdraw from this contract. You may use the attached model withdrawal form, but you are not required to do so.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            <strong>Tüketiciler için Geri Çekme Hakkı:</strong> Herhangi bir neden göstermeden, malların tedarikine ilişkin sözleşmeyi imzaladığınız tarihten itibaren 14 gün içinde çözme hakkına sahipsiniz. Geri çekme süresi, siz veya sizin tarafından belirlenen üçüncü bir kişi (taşıyıcı değil) malları alması günü itibaren 14 gündür.
          </p>
          <p>
            Geri çekme hakkınızı kullanmak için, bu sözleşmeyi geri çekmek istediğiniz konusunda net bir beyanda bulunarak bize e-posta, mektup, telefon veya faks yoluyla bildirim yapmalısınız. Ekteki model geri çekme formunu kullanabilirsiniz, ancak bunu yapmanız zorunlu değildir.
          </p>
        </div>
      ),
    },
    {
      id: 'exceptions',
      title: isGerman ? 'Ausnahmen vom Widerrufsrecht' : 'Exceptions to the Withdrawal Right',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>Das Widerrufsrecht besteht nicht für folgende Verträge:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Verträge für die Lieferung von maßangefertigten Waren, die nach Kundenvorgaben hergestellt wurden</li>
            <li>Verträge für verderbliche Waren oder Waren, die schnell verderben können</li>
            <li>Verträge für die Lieferung von versiegelten Waren, bei denen nach Öffnung der Versiegelung ein Rückgaberecht ausgeschlossen ist (z.B. Hygieneprodukte)</li>
            <li>Verträge für die Lieferung von Waren, die nach dem Kauf untrennbar mit anderen Waren vermischt werden</li>
          </ul>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>The right of withdrawal does not apply to the following contracts:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Contracts for the supply of custom-made goods manufactured according to customer specifications</li>
            <li>Contracts for the supply of perishable goods or goods that can spoil quickly</li>
            <li>Contracts for the supply of sealed goods where the right to return is excluded after opening the seal (e.g., hygiene products)</li>
            <li>Contracts for the supply of goods that become inseparably mixed with other goods after purchase</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>Geri çekme hakkı aşağıdaki sözleşmeleri kapsamaz:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Müşteri özelliklerine göre üretilen özel siparişli malların tedarikine ilişkin sözleşmeler</li>
            <li>Çabuk bozulabilen veya hızlı bir şekilde bozulabilecek malların tedarikine ilişkin sözleşmeler</li>
            <li>Mühürü açıldıktan sonra iade hakkının hariç tutulduğu kapalı malların tedarikine ilişkin sözleşmeler (ör. hijyen ürünleri)</li>
            <li>Satın alma sonrasında diğer mallarla ayrılmaz bir şekilde karışan malların tedarikine ilişkin sözleşmeler</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'consequences',
      title: isGerman ? 'Folgen des Widerrufs' : 'Consequences of Withdrawal',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            <strong>Rückgabe von Waren:</strong> Wenn Sie diesen Vertrag widerrufen, müssen Sie alle erhaltenen Waren ohne Versäumnis und in jedem Fall spätestens 14 Tage nach dem Tag zurückgeben, an dem Sie uns von Ihrem Widerrufsrecht in Kenntnis setzen. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der 14-Tage-Frist absenden.
          </p>
          <p>
            <strong>Rückerstattung:</strong> Wir werden alle von Ihnen erhaltenen Zahlungen, einschließlich der Versandkosten (mit Ausnahme zusätzlicher Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene billigste Standardlieferung gewählt haben), ohne Versäumnis und spätestens 14 Tage nach dem Tag erstatten, an dem wir von Ihrem Widerruf unterrichtet wurden.
          </p>
          <p>
            <strong>Rückgabeadresse:</strong> Bitte senden Sie die Waren an:<br />
            2MC Gastro GmbH<br />
            Retouren<br />
            [Straße und Hausnummer]<br />
            [PLZ Stadt]<br />
            Deutschland
          </p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            <strong>Return of Goods:</strong> If you withdraw from this contract, you must return all goods received without delay and in any case no later than 14 days after the day you notify us of your withdrawal right. The deadline is met if you return the goods before the 14-day period expires.
          </p>
          <p>
            <strong>Refund:</strong> We will refund all payments received from you, including shipping costs (with the exception of additional costs arising from your choice of a different delivery method than the cheapest standard delivery we offer), without delay and no later than 14 days after the day we were notified of your withdrawal.
          </p>
          <p>
            <strong>Return Address:</strong> Please send the goods to:<br />
            2MC Gastro GmbH<br />
            Returns<br />
            [Street and House Number]<br />
            [Postal Code City]<br />
            Germany
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            <strong>Malların İadesi:</strong> Bu sözleşmeyi geri çekerseniz, almış olduğunuz tüm malları gecikmeden ve en geç geri çekme hakkı hakkında bizi bilgilendirdiğiniz günden itibaren 14 gün içinde iade etmelisiniz. Malları 14 günlük süre içinde gönderirseniz, süre sonu muhafaza edilir.
          </p>
          <p>
            <strong>Geri Ödeme:</strong> Tarafınızdan alınan tüm ödemeleri, kargo maliyetleri dahil (sunduğumuz en ucuz standart teslimat dışında farklı bir teslimat yöntemi seçmenizden kaynaklanan ek maliyetler hariç), gecikmeden ve geri çekme hakkında bilgilendirildiğimiz günden itibaren en geç 14 gün içinde iade edeceğiz.
          </p>
          <p>
            <strong>Iade Adresi:</strong> Lütfen malları şu adrese gönderin:<br />
            2MC Gastro GmbH<br />
            İadeler<br />
            [Cadde ve Ev Numarası]<br />
            [Posta Kodu Şehir]<br />
            Almanya
          </p>
        </div>
      ),
    },
    {
      id: 'costs',
      title: isGerman ? 'Kosten der Rückgabe' : 'Cost of Return',
      content: isGerman ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            Sie tragen die unmittelbaren Kosten der Rückgabe der Waren. Falls die Waren infolge unserer Bewerbung oder Fehler zu einem anderen Ort versandt wurden als zu dem Ort, an dem Sie die Waren erhalten hätten, müssen Sie diese Kosten nicht tragen.
          </p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            You bear the direct costs of returning the goods. If the goods were shipped to a different location than where you received them as a result of our advertising or error, you do not have to bear these costs.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>
            Malların iadesi için doğrudan maliyetleri siz karşılarsınız. Mallar, bizim reklamımız veya hatamız sonucunda siz malları aldığınız yerden farklı bir yere gönderildiyse, bu maliyetleri karşılamanız gerekmez.
          </p>
        </div>
      ),
    },
    {
      id: 'form',
      title: isGerman ? 'Muster-Widerrufsformular' : 'Model Withdrawal Form',
      content: isGerman ? (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p className="italic">
            Falls Sie diesen Vertrag widerrufen möchten, füllen Sie bitte dieses Formular aus und senden Sie es an uns zurück.
          </p>
          <div className="bg-surface-container-lowest rounded p-4 border border-outline-variant/20 font-mono text-xs space-y-2">
            <p>—— BEGINN DES MUSTER-WIDERRUFSFORMULARS ——</p>
            <p>Betreffzeile: Widerruf eines Vertrags</p>
            <p>
              Hiermit widerrufe ich den von mir geschlossenen Vertrag über den Kauf der folgenden Waren:<br />
              Bestellnummer: ________________<br />
              Bestelldatum: ________________<br />
              Name des Verbrauchers: ________________<br />
              Adresse des Verbrauchers: ________________<br />
              Unterschrift des Verbrauchers (nur bei Mitteilung auf Papier): ________________<br />
              Datum: ________________
            </p>
            <p>—— ENDE DES MUSTER-WIDERRUFSFORMULARS ——</p>
          </div>
          <p className="flex items-center gap-2">
            <Download size={14} />
            <a href="#" className="text-primary hover:underline">Widerrufsformular herunterladen (PDF)</a>
          </p>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p className="italic">
            If you wish to withdraw from this contract, please fill out this form and return it to us.
          </p>
          <div className="bg-surface-container-lowest rounded p-4 border border-outline-variant/20 font-mono text-xs space-y-2">
            <p>—— BEGIN OF MODEL WITHDRAWAL FORM ——</p>
            <p>Subject line: Withdrawal from a contract</p>
            <p>
              I hereby withdraw the contract concluded by me for the purchase of the following goods:<br />
              Order number: ________________<br />
              Order date: ________________<br />
              Name of consumer: ________________<br />
              Address of consumer: ________________<br />
              Signature of consumer (only for notification on paper): ________________<br />
              Date: ________________
            </p>
            <p>—— END OF MODEL WITHDRAWAL FORM ——</p>
          </div>
          <p className="flex items-center gap-2">
            <Download size={14} />
            <a href="#" className="text-primary hover:underline">Download withdrawal form (PDF)</a>
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p className="italic">
            Bu sözleşmeyi geri çekmek istiyorsanız, lütfen bu formu doldurun ve bize geri gönderin.
          </p>
          <div className="bg-surface-container-lowest rounded p-4 border border-outline-variant/20 font-mono text-xs space-y-2">
            <p>—— GERİ ÇEKME FORMU BAŞLANGIÇ ——</p>
            <p>Konu satırı: Bir sözleşmeyi geri çekme</p>
            <p>
              Aşağıdaki malların satın alınması için yapmış olduğum sözleşmeyi bundan böyle geri çekiyorum:<br />
              Sipariş numarası: ________________<br />
              Sipariş tarihi: ________________<br />
              Tüketici adı: ________________<br />
              Tüketici adresi: ________________<br />
              Tüketici imzası (yalnızca kağıt üzerinde bildirim için): ________________<br />
              Tarih: ________________
            </p>
            <p>—— GERİ ÇEKME FORMU SONU ——</p>
          </div>
          <p className="flex items-center gap-2">
            <Download size={14} />
            <a href="#" className="text-primary hover:underline">Geri çekme formunu indir (PDF)</a>
          </p>
        </div>
      ),
    },
    {
      id: 'button',
      title: isGerman ? 'Gesetzlich erforderliche Schaltfläche (2026)' : 'Legally Required Button (2026)',
      content: isGerman ? (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Gemäß den aktuellen EU-Richtlinien müssen E-Commerce-Plattformen eine Schaltfläche zur Erleichterung des Widerrufsverfahrens bereitstellen. Diese Schaltfläche befindet sich typischerweise im Benutzerkonto oder bei den Bestelldetails:
          </p>
          <div className="bg-primary/10 rounded p-4 border border-primary/30 flex flex-col gap-3">
            <button className="px-6 py-3 rounded-lg text-white font-bold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--brand-accent)' }}>
              {isGerman ? 'Bestellung widerrufen' : i18n.language === 'en' ? 'Withdraw order' : 'Siparişi geri çek'}
            </button>
            <p className="text-xs text-on-surface-variant">
              {isGerman ? 'Diese Schaltfläche wird in Ihrem Benutzerkonto angezeigt und ermöglicht es Ihnen, ein Widerrufsrecht auszuüben.' : i18n.language === 'en' ? 'This button will be displayed in your account and allows you to exercise a withdrawal right.' : 'Bu düğme hesabınızda görüntülenecek ve geri çekme hakkını kullanmanıza izin verecektir.'}
            </p>
          </div>
        </div>
      ) : i18n.language === 'en' ? (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            According to current EU directives, e-commerce platforms must provide a button to facilitate the withdrawal process. This button is typically located in the user account or at the order details:
          </p>
          <div className="bg-primary/10 rounded p-4 border border-primary/30 flex flex-col gap-3">
            <button className="px-6 py-3 rounded-lg text-white font-bold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--brand-accent)' }}>
              {isGerman ? 'Bestellung widerrufen' : i18n.language === 'en' ? 'Withdraw order' : 'Siparişi geri çek'}
            </button>
            <p className="text-xs text-on-surface-variant">
              This button will be displayed in your account and allows you to exercise a withdrawal right.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Mevcut AB yönergelerine göre, e-ticaret platformları geri çekme işlemini kolaylaştırmak için bir düğme sağlamalıdır. Bu düğme tipik olarak kullanıcı hesabında veya sipariş ayrıntılarında bulunur:
          </p>
          <div className="bg-primary/10 rounded p-4 border border-primary/30 flex flex-col gap-3">
            <button className="px-6 py-3 rounded-lg text-white font-bold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--brand-accent)' }}>
              {isGerman ? 'Bestellung widerrufen' : i18n.language === 'en' ? 'Withdraw order' : 'Siparişi geri çek'}
            </button>
            <p className="text-xs text-on-surface-variant">
              Bu düğme hesabınızda görüntülenecek ve geri çekme hakkını kullanmanıza izin verecektir.
            </p>
          </div>
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
            {isGerman ? 'Widerrufsbelehrung' : i18n.language === 'en' ? 'Withdrawal Policy' : 'Geri Çekme Politikası'}
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
