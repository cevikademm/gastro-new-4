import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLocalePath } from '../../lib/useLocalePath';

export interface Crumb { name: string; url: string }

export default function Breadcrumbs({ items, dark = true }: { items: Crumb[]; dark?: boolean }) {
  const lp = useLocalePath();
  const base = dark ? 'text-white/60' : 'text-slate-600'; // slate-500 beyaz üstünde 4,36:1 (WCAG AA 4,5 altı)
  const cur = dark ? 'text-white' : 'text-slate-900';
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-xs md:text-[13px] mb-4 ${base}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.url + i} className="flex items-center gap-1.5">
              {last
                ? <span aria-current="page" className={`font-semibold ${cur} truncate max-w-[260px]`}>{it.name}</span>
                : <Link to={lp(it.url)} className="hover:text-brand-red transition-colors">{it.name}</Link>}
              {!last && <ChevronRight size={12} className="opacity-60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
