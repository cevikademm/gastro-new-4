import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

export default function ZahlungsbedingungenPage() {
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };
  const isGerman = i18n.language === 'de';
  const sections = [
    {id:'scope', title: isGerman ? '§1 Geltungsbereich' : '§1 Scope', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><p>Diese Zahlungsbedingungen regeln Zahlungsarten und -fristen für B2B-Geschäfte.</p><p>Netto-Preise gelten für alle Preise, sofern nicht anders angegeben.</p></div> : <div className="space-y-2 text-sm text-on-surface-variant"><p>These payment terms govern payment methods and terms for B2B transactions.</p><p>Net prices apply unless otherwise specified.</p></div>},
    {id:'payment-methods', title: isGerman ? '§2 Zahlungsarten' : '§2 Payment Methods', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><ul className="list-disc list-inside ml-2"><li>Rechnung (Invoice)</li><li>Vorkasse (Prepayment)</li><li>SEPA-Lastschrift</li><li>Kreditkarte</li><li>Leasing</li></ul></div> : <div className="space-y-2 text-sm text-on-surface-variant"><ul className="list-disc list-inside ml-2"><li>Invoice</li><li>Prepayment</li><li>SEPA Direct Debit</li><li>Credit Card</li><li>Leasing</li></ul></div>},
    {id:'payment-terms', title: isGerman ? '§3 Zahlungsfristen' : '§3 Payment Terms', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><p><strong>Net-30:</strong> 30 Tage nach Rechnungsdatum</p><p><strong>Skonto:</strong> 2% bei Zahlung innerhalb 10 Tagen</p></div> : <div className="space-y-2 text-sm text-on-surface-variant"><p><strong>Net-30:</strong> 30 days after invoice date</p><p><strong>Early Payment:</strong> 2% discount if paid within 10 days</p></div>},
  ];
  return (
    <div className="min-h-screen bg-surface"><div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20"><div className="mb-12"><h1 className="text-4xl md:text-5xl font-black text-on-surface font-headline mb-4">{isGerman ? 'Zahlungsbedingungen' : i18n.language === 'en' ? 'Payment Conditions' : 'Ödeme Koşulları'}</h1></div><div className="space-y-4">{sections.map((section) => (<div key={section.id} className="border border-outline-variant/30 rounded-lg overflow-hidden"><button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors"><h2 className="text-lg font-bold text-on-surface text-left">{section.title}</h2><ChevronDown size={20} className={`text-on-surface-variant transition-transform ${expandedSections.includes(section.id) ? 'rotate-180' : ''}`} /></button>{expandedSections.includes(section.id) && (<div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low">{section.content}</div>)}</div>))}</div><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-12 inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-70 transition-opacity">↑ {isGerman ? 'Nach oben' : 'Back to top'}</button></div></div>
  );
}
