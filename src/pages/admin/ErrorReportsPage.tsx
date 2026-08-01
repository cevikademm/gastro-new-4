// ─── Hata Merkezi (Admin) ────────────────────────────────────────────
// Rota: /admin/error-reports (AdminGuard) · Nav: Layout ADMIN_ITEMS
//
// Dört sekme, üç ayrı Supabase tablosu:
//   Bildirimler    → error_reports  (admin'in elle bildirdiği · widget)
//   Sistem Logları → error_logs     (uygulamanın otomatik yakaladığı)
//   İşlem Geçmişi  → error_fixes    (AI analizi / webhook / durum değişimi)
//   Otomasyon      → app_settings   (webhook aç/kapa + URL + sır)
//
// SQL: migrations/018 (reports) · 030 (ai_prompt) · 031 (logs + fixes + webhook)
import { lazy, Suspense, useState } from 'react';
import { Bug, ScrollText, History, Zap, Bot, Loader2 } from 'lucide-react';
import ReportsPanel from './errorReports/ReportsPanel';

const LogsPanel = lazy(() => import('./errorReports/LogsPanel'));
const HistoryPanel = lazy(() => import('./errorReports/HistoryPanel'));
const AutomationPanel = lazy(() => import('./errorReports/AutomationPanel'));
const AgentPanel = lazy(() => import('./errorReports/AgentPanel'));

type TabKey = 'reports' | 'logs' | 'history' | 'automation' | 'agent';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Bug; hint: string }> = [
  { key: 'reports', label: 'Bildirimler', icon: Bug, hint: 'Adminlerin elle ilettiği hatalar — ekran görüntüsü ve açıklamasıyla.' },
  { key: 'logs', label: 'Sistem Logları', icon: ScrollText, hint: 'Uygulamanın otomatik yakaladığı JS/promise hataları. Aynı hata tek satırda toplanır.' },
  { key: 'history', label: 'İşlem Geçmişi', icon: History, hint: 'Her kayda ne olduğu: webhook tetiklendi, AI analizi üretildi, durum değişti.' },
  { key: 'automation', label: 'Otomasyon', icon: Zap, hint: 'Yeni hata düşünce Claude Haiku otomatik düzeltme prompt\'u üretsin.' },
  { key: 'agent', label: 'Ajan', icon: Bot, hint: 'Saatte bir çalışan bulut ajanı hataları kodda düzeltip canlıya alır.' },
];

const Fallback = () => (
  <div className="p-12 text-center text-on-surface-variant">
    <Loader2 className="animate-spin mx-auto mb-2" /> Yükleniyor…
  </div>
);

export default function ErrorReportsPage() {
  const [tab, setTab] = useState<TabKey>('reports');
  const active = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div className="max-w-7xl mx-auto space-y-5 w-full">
      <header>
        <h1 className="text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
          <Bug size={28} /> Hata Merkezi
        </h1>
        <p className="text-on-surface-variant mt-1">{active.hint}</p>
      </header>

      {/* Sekmeler */}
      <div className="flex flex-wrap gap-1 border-b border-outline-variant/20">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={on ? 'page' : undefined}
              className={`px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                on
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-t-lg'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'reports' && <ReportsPanel />}
      {tab === 'logs' && <Suspense fallback={<Fallback />}><LogsPanel /></Suspense>}
      {tab === 'history' && <Suspense fallback={<Fallback />}><HistoryPanel /></Suspense>}
      {tab === 'automation' && <Suspense fallback={<Fallback />}><AutomationPanel /></Suspense>}
      {tab === 'agent' && <Suspense fallback={<Fallback />}><AgentPanel /></Suspense>}
    </div>
  );
}
