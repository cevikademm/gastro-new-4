// ─── Düzeltme durumu rozeti ──────────────────────────────────────────
// Otomatik düzeltme ajanının kaydı hangi aşamada olduğunu gösterir.
// Durum makinesi: migration 037 · Ajan: supabase/functions/fix-agent
import { ExternalLink } from 'lucide-react';
import type { FixStatus } from '../../../lib/errorReport';

const META: Record<FixStatus, { label: string; color: string; title: string }> = {
  none:             { label: 'Kuyrukta',    color: '#94A3B8', title: 'Ajan henüz almadı' },
  eligible:         { label: 'Ajana verildi', color: '#6366F1', title: 'Sıradaki koşuda alınacak' },
  claimed:          { label: 'Ajanda',      color: '#6366F1', title: 'Ajan üzerinde çalışıyor' },
  committed:        { label: "Commit'lendi", color: '#0EA5E9', title: 'Dağıtım bekleniyor' },
  deployed:         { label: 'Canlıda',     color: '#16A34A', title: 'Canlıya alındı, doğrulama bekleniyor' },
  verified:         { label: 'Doğrulandı',  color: '#15803D', title: 'Hata tekrar etmedi' },
  failed:           { label: 'Başarısız',   color: '#DC2626', title: 'Kapılardan geçemedi' },
  skipped:          { label: 'İnsana kaldı', color: '#B45309', title: 'Ajan vazgeçti' },
  revert_requested: { label: 'Geri alınıyor', color: '#EA580C', title: 'Hata tekrar etti — geri alma kuyruğunda' },
  reverted:         { label: 'Geri alındı', color: '#DC2626', title: 'Düzeltme geri alındı' },
  manual:           { label: 'Elde',        color: '#64748B', title: 'Admin devraldı' },
};

interface Props {
  status?: FixStatus | null;
  commitSha?: string | null;
  commitUrl?: string | null;
}

export default function FixStatusBadge({ status, commitSha, commitUrl }: Props) {
  // 'none' varsayılan durum — her kartta gri rozet göstermek gürültü olur.
  if (!status || status === 'none') return null;
  const m = META[status] || META.none;

  return (
    <span className="inline-flex items-center gap-1">
      <span
        title={m.title}
        className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border"
        style={{ background: `${m.color}1a`, color: m.color, borderColor: `${m.color}44` }}
      >
        {m.label}
      </span>
      {commitSha && (
        commitUrl ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Commit ${commitSha} — geri almak için: git revert ${commitSha.slice(0, 7)}`}
            className="text-[11px] font-mono text-on-surface-variant hover:text-primary inline-flex items-center gap-0.5"
          >
            {commitSha.slice(0, 7)} <ExternalLink size={10} />
          </a>
        ) : (
          <span
            title={`git revert ${commitSha.slice(0, 7)}`}
            className="text-[11px] font-mono text-on-surface-variant"
          >
            {commitSha.slice(0, 7)}
          </span>
        )
      )}
    </span>
  );
}
