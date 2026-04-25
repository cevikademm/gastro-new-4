import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

export default function LieferbedingungenPage() {
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };
  const isGerman = i18n.language === 'de';
  const sections = [
    {id:'scope', title: isGerman ? '§1 Geltungsbereich' : '§1 Scope', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><p>Diese Lieferbedingungen regeln die Lieferung von Waren durch 2MC Gastro GmbH an gewerbliche Kunden (B2B).</p></div> : <div className="space-y-2 text-sm text-on-surface-variant"><p>These delivery terms govern the delivery of goods by 2MC Gastro GmbH to commercial customers (B2B).</p></div>},
    {id:'delivery-time', title: isGerman ? '§2 Lieferfrist' : '§2 Delivery Time', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><p><strong>Standard:</strong> 5-10 Werktage nach Auftragsbestätigung und Zahlungseingang.</p></div> : <div className="space-y-2 text-sm text-on-surface-variant"><p><strong>Standard:</strong> 5-10 working days after order confirmation and payment receipt.</p></div>},
    {id:'delivery-area', title: isGerman ? '§3 Liefergebiet' : '§3 Delivery Area', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><p>Deutschland, Österreich, Luxemburg, Belgien, Niederlande, Dänemark, Schweden, Finnland, Polen, Tschechien.</p></div> : <div className="space-y-2 text-sm text-on-surface-variant"><p>Germany, Austria, Luxembourg, Belgium, Netherlands, Denmark, Sweden, Finland, Poland, Czech Republic.</p></div>},
    {id:'risk-transfer', title: isGerman ? '§4 Gefahrübergang' : '§4 Transfer of Risk', content: isGerman ? <div className="space-y-2 text-sm text-on-surface-variant"><p>Der Gefahrübergang tritt ein, sobald die Ware unser Betriebsgelände verlässt.</p></div> : <div className="space-y-2 text-sm text-on-surface-variant"><p>Risk transfers when goods leave our premises.</p></div>},
  ];
  return (
    <div className="min-h-screen bg-surface"><div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20"><div className="mb-12"><h1 className="text-4xl md:text-5xl font-black text-on-surface font-headline mb-4">{isGerman ? 'Lieferbedingungen' : i18n.language === 'en' ? 'Delivery Terms' : 'Teslimat Koşulları'}</h1></div><div className="space-y-4">{sections.map((section) => (<div key={section.id} className="border border-outline-variant/30 rounded-lg overflow-hidden"><button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors"><h2 className="text-lg font-bold text-on-surface text-left">{section.title}</h2><ChevronDown size={20} className={`text-on-surface-variant transition-transform ${expandedSections.includes(section.id) ? 'rotate-180' : ''}`} /></button>{expandedSections.includes(section.id) && (<div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low">{section.content}</div>)}</div>))}</div><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-12 inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-70 transition-opacity">↑ {isGerman ? 'Nach oben' : 'Back to top'}</button></div></div>
  );
}
