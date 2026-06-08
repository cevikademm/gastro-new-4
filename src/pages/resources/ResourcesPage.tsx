import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown, CheckCircle2, Lock } from 'lucide-react';
import SEO from '../../components/SEO';
import { LEAD_MAGNETS, type LeadMagnet } from '../../content/leadMagnets';
import { submitLead } from '../../lib/leadCapture';
import { sendEmail } from '../../lib/email';
import { breadcrumbSchema, organizationSchema } from '../../lib/seo';

export default function ResourcesPage() {
  const [active, setActive] = useState<LeadMagnet | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!active || !email.trim() || sending) return;
    setSending(true);
    setErr('');
    try {
      await submitLead(email.trim(), 'lead_magnet', { magnet: active.slug });
      await sendEmail({
        template: 'lead-magnet',
        to: email.trim(),
        data: { title: active.title, downloadUrl: `https://2mcgastro.com${active.downloadUrl}` },
      });
      setDone(true);
    } catch (e: any) {
      setErr('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <SEO
        title="Ücretsiz Rehberler & Şablonlar — 2MC Gastro"
        description="HACCP kontrol listesi, bütçe şablonları, satın alma rehberleri. Endüstriyel mutfak profesyonelleri için ücretsiz kaynaklar."
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Kaynaklar', url: '/resources' },
          ]),
        ]}
      />

      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
          Ücretsiz Rehberler & Şablonlar
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl">
          Endüstriyel mutfak kurulumunda size yıllarca hizmet edecek uzman kaynaklar — hepsi ücretsiz.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LEAD_MAGNETS.map((m) => (
          <div key={m.slug} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <FileDown size={14} /> {m.pages} sayfa · PDF
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{m.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{m.description}</p>
            <ul className="space-y-1.5 mb-5 flex-1">
              {m.bullets.map((b, i) => (
                <li key={i} className="text-xs text-slate-700 flex gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 flex-none" /> {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => { setActive(m); setDone(false); setErr(''); }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg font-semibold hover:bg-[#991B1B]"
            >
              <Lock size={14} /> Ücretsiz İndir
            </button>
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => !sending && setActive(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center py-6">
                <CheckCircle2 className="text-emerald-600 mx-auto mb-3" size={48} />
                <h3 className="text-xl font-bold mb-2">E-postanıza gönderildi!</h3>
                <p className="text-slate-600 text-sm mb-5">
                  İndirme bağlantısı <strong>{email}</strong> adresine iletildi. Birkaç dakika içinde gelmezse spam klasörünü kontrol edin.
                </p>
                <a
                  href={active.downloadUrl}
                  download
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#DC2626] text-white rounded-lg font-semibold"
                >
                  <FileDown size={16} /> Şimdi de indir
                </a>
              </div>
            ) : (
              <>
                <div className="text-xs text-[#DC2626] font-semibold mb-1">Ücretsiz İndir</div>
                <h3 className="text-xl font-bold mb-2">{active.title}</h3>
                <p className="text-slate-600 text-sm mb-5">
                  E-posta adresinizi girin; PDF indirme bağlantısını size hemen gönderelim.
                </p>
                <input
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 mb-3 focus:outline-none focus:border-[#DC2626]"
                />
                {err && <div className="text-sm text-red-600 mb-3">{err}</div>}
                <button
                  onClick={submit}
                  disabled={sending || !email.includes('@')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg font-semibold hover:bg-[#991B1B] disabled:opacity-50"
                >
                  {sending ? 'Gönderiliyor…' : 'PDF\'i Gönder'}
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-3">
                  Spam yok. İstediğiniz zaman abonelikten çıkabilirsiniz.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
