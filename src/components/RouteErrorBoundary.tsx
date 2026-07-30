import React from 'react';
import { logReactError } from '../lib/errorLog';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

const CHUNK_FLAG = 'rt-chunk-reloaded';

// Dinamik import / stale chunk hatalarını tanı (dev HMR desync veya yeni deploy sonrası)
function isChunkError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  return /dynamically imported module|importing a module script failed|Failed to fetch dynamically|error loading dynamically|ChunkLoadError|Importing a module script failed/i.test(msg);
}

export default class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Stale chunk → bir kez otomatik yenile (sonsuz döngüyü engelle)
    if (isChunkError(error) && !sessionStorage.getItem(CHUNK_FLAG)) {
      sessionStorage.setItem(CHUNK_FLAG, '1');
      window.location.reload();
      return; // sayfa gidiyor; log yazmaya çalışma
    }
    // error_logs'a yaz → admin panelde "Sistem Logları" sekmesinde görünür.
    logReactError(error, info?.componentStack || undefined);
  }

  private handleReload = () => {
    sessionStorage.removeItem(CHUNK_FLAG);
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkError(error);
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-red/10 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-[#0F2440]">
          {chunk ? 'Sayfa güncellendi, yeniden yükleniyor…' : 'Bir şeyler ters gitti'}
        </h1>
        <p className="text-sm text-slate-500 max-w-md break-words">
          {chunk
            ? 'Uygulamanın yeni sürümü yüklendi. Sayfayı yenileyerek devam edebilirsiniz.'
            : String(error.message || error)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 bg-brand-red text-white rounded-lg font-bold text-sm hover:bg-[#B91C1C] transition-colors"
          >
            Sayfayı Yenile
          </button>
          <a
            href="/"
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            Ana Sayfa
          </a>
        </div>
      </div>
    );
  }
}
