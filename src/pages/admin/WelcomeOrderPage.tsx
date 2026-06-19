import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, GripVertical, RotateCcw, Check, ExternalLink, MousePointer2, X,
} from 'lucide-react';
import {
  useWelcomeOrderStore,
  SECTION_LABELS,
  SORTABLE_SECTION_IDS,
  type WelcomeSectionId,
} from '../../stores/welcomeOrderStore';

/**
 * Karşılama sayfası bölüm sıralaması.
 * Üç yöntem destekleniyor:
 *   1. TIKLA-TIKLA TAŞI (en güvenilir): satıra tıkla → seç, hedef satıra tıkla → yer değiştir
 *   2. ↑↓ BUTONLARI: tek adım yukarı/aşağı
 *   3. SÜRÜKLE-BIRAK: pointer events tabanlı (native HTML5 drag yerine)
 */
export default function WelcomeOrderPage() {
  const order = useWelcomeOrderStore((s) => s.order);
  const setOrder = useWelcomeOrderStore((s) => s.setOrder);
  const reset = useWelcomeOrderStore((s) => s.reset);

  // Tıkla-tıkla taşı modu
  const [picked, setPicked] = useState<WelcomeSectionId | null>(null);

  // Pointer-based drag
  const [dragId, setDragId] = useState<WelcomeSectionId | null>(null);
  const [dragY, setDragY] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number; rowH: number; rowOffset: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [savedFlash, setSavedFlash] = useState(false);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  };

  /* ───────── Tıkla-tıkla taşı ───────── */
  const handleRowClick = (id: WelcomeSectionId) => {
    if (dragId) return; // sürüklerken tıklamayı yutmayalım
    if (!picked) {
      setPicked(id);
      return;
    }
    if (picked === id) {
      setPicked(null); // aynı satıra tıkladı → iptal
      return;
    }
    // pickeed → id konumuna taşı
    const cur = [...order];
    const fromIdx = cur.indexOf(picked);
    const toIdx = cur.indexOf(id);
    cur.splice(fromIdx, 1);
    cur.splice(toIdx, 0, picked);
    setOrder(cur);
    setPicked(null);
    flashSaved();
  };

  /* ───────── Pointer drag ───────── */
  const onPointerDown = (id: WelcomeSectionId) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // sadece sol click
    const row = (e.currentTarget.closest('li') as HTMLLIElement | null);
    if (!row) return;
    const rect = row.getBoundingClientRect();
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      rowH: rect.height,
      rowOffset: e.clientY - rect.top,
    };
    setDragId(id);
    setDragY(0);
    setHoverIdx(order.indexOf(id));
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId || !startPosRef.current) return;
    e.preventDefault();
    const dy = e.clientY - startPosRef.current.y;
    setDragY(dy);

    // Hangi indekse geldiğini hesapla
    const list = listRef.current;
    if (!list) return;
    const rows: HTMLLIElement[] = Array.from(list.querySelectorAll('li[data-row-id]'));
    let target = order.indexOf(dragId);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (e.clientY < mid) {
        target = i;
        break;
      }
      target = i; // son satırın altı
    }
    setHoverIdx(target);
  };

  const onPointerUp = () => {
    if (dragId && hoverIdx !== null) {
      const fromIdx = order.indexOf(dragId);
      if (fromIdx !== hoverIdx) {
        const cur = [...order];
        cur.splice(fromIdx, 1);
        cur.splice(hoverIdx, 0, dragId);
        setOrder(cur);
        flashSaved();
      }
    }
    setDragId(null);
    setHoverIdx(null);
    startPosRef.current = null;
    setDragY(0);
  };

  // Global pointermove/pointerup ki listenin dışına çıksa bile yakalansın
  useEffect(() => {
    if (!dragId) return;
    const move = (e: PointerEvent) => onPointerMove(e as unknown as React.PointerEvent);
    const up = () => onPointerUp();
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, hoverIdx, order]);

  /* ───────── Buton hareketleri ───────── */
  const move = (id: WelcomeSectionId, dir: -1 | 1) => {
    const cur = [...order];
    const from = cur.indexOf(id);
    const to = from + dir;
    if (to < 0 || to >= cur.length) return;
    [cur[from], cur[to]] = [cur[to], cur[from]];
    setOrder(cur);
    flashSaved();
  };

  const handleReset = () => {
    if (!confirm('Sıralamayı varsayılana döndürmek istediğinden emin misin?')) return;
    reset();
    setPicked(null);
    flashSaved();
  };

  /* ───────── ESC ile iptal ───────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPicked(null);
        setDragId(null);
        setHoverIdx(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#faf9f5', color: '#0F2440' }}>
      <header className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: '#e8e6df' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: '#0F2440' }}
          >
            <ArrowLeft size={16} />
            Karşılama
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {savedFlash && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: '#dcf3e2', color: '#1b7f3a' }}
              >
                <Check size={12} />
                Kaydedildi
              </span>
            )}
            <a
              href="/welcome"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors"
              style={{ borderColor: '#e8e6df', color: '#0F2440', background: '#fff' }}
            >
              <ExternalLink size={13} />
              Yeni sekmede aç
            </a>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors"
              style={{ borderColor: '#e8e6df', color: '#DC2626', background: '#fff' }}
            >
              <RotateCcw size={13} />
              Varsayılan
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2" style={{ color: '#DC2626' }}>
            // ADMIN · WELCOME ORDER
          </div>
          <h1
            className="text-3xl md:text-4xl leading-[1.1]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, letterSpacing: '-0.025em' }}
          >
            Bölüm <em style={{ color: '#DC2626', fontStyle: 'italic' }}>sıralaması</em>
          </h1>
        </div>

        {/* KULLANIM REHBERİ */}
        <div
          className="mb-6 p-4 rounded-2xl border"
          style={{ background: '#fff', borderColor: '#e8e6df' }}
        >
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#DC2626' }}>
            // 3 yöntem · sana en kolayını seç
          </div>
          <ol className="space-y-2 text-[13px]" style={{ color: '#0F2440' }}>
            <li className="flex gap-3">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                style={{ background: '#DC2626' }}
              >
                1
              </span>
              <span>
                <strong>Tıkla–tıkla taşı (en kolay):</strong> Bir satıra tıkla → clay dolgulu olur. Sonra hedef satıra tıkla → yer değiştirirler.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                style={{ background: 'rgba(220, 38, 38,0.12)', color: '#DC2626' }}
              >
                2
              </span>
              <span>
                <strong>↑ ↓ butonları:</strong> Sağdaki ok butonlarıyla bir adım yukarı/aşağı taşı.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                style={{ background: 'rgba(220, 38, 38,0.12)', color: '#DC2626' }}
              >
                3
              </span>
              <span>
                <strong>Sürükle:</strong> Soldaki <code className="px-1 rounded text-[11px]" style={{ background: '#faf9f5', border: '1px solid #e8e6df' }}>⋮⋮</code> tutamacına bas, fareyi yeni konuma getir, bırak.
              </span>
            </li>
          </ol>
          {picked && (
            <div
              className="mt-3 px-3 py-2 rounded-lg text-[12px] font-semibold flex items-center gap-2"
              style={{ background: 'rgba(220, 38, 38,0.08)', color: '#DC2626' }}
            >
              <MousePointer2 size={13} />
              <span>
                <strong>{SECTION_LABELS[picked].tr}</strong> seçildi · şimdi taşımak istediğin konumdaki satıra tıkla.
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="ml-2 inline-flex items-center gap-1 underline"
                >
                  <X size={11} /> iptal (Esc)
                </button>
              </span>
            </div>
          )}
        </div>

        {/* LİSTE */}
        <ul ref={listRef} className="space-y-2 select-none" style={{ touchAction: 'none' }}>
          {order.map((id, idx) => {
            const meta = SECTION_LABELS[id];
            const isPicked = picked === id;
            const isDragging = dragId === id;
            const isDropTarget = dragId !== null && dragId !== id && hoverIdx === idx;

            // Drag yer değiştirmesi için diğer satırları kaydır
            let translateY = 0;
            if (dragId && !isDragging) {
              const fromIdx = order.indexOf(dragId);
              const rowH = startPosRef.current?.rowH ?? 88;
              if (fromIdx < idx && hoverIdx !== null && hoverIdx >= idx) translateY = -rowH;
              if (fromIdx > idx && hoverIdx !== null && hoverIdx <= idx) translateY = rowH;
            }

            return (
              <li
                key={id}
                data-row-id={id}
                onClick={() => handleRowClick(id)}
                className="group flex items-center gap-3 rounded-2xl p-4 border transition-[transform,box-shadow,background] cursor-pointer"
                style={{
                  background: isPicked ? '#DC2626' : '#fff',
                  borderColor: isPicked
                    ? '#991B1B'
                    : isDropTarget
                      ? '#DC2626'
                      : '#e8e6df',
                  color: isPicked ? '#fff' : '#0F2440',
                  boxShadow: isDragging
                    ? '0 24px 48px -12px rgba(220, 38, 38,0.4)'
                    : isPicked
                      ? '0 14px 32px -12px rgba(220, 38, 38,0.5)'
                      : isDropTarget
                        ? '0 12px 28px -10px rgba(220, 38, 38,0.22)'
                        : '0 1px 2px rgba(15,36,64,0.04)',
                  transform: isDragging
                    ? `translateY(${dragY}px) scale(1.02)`
                    : `translateY(${translateY}px)`,
                  zIndex: isDragging ? 50 : 1,
                  position: 'relative',
                  opacity: isDragging ? 0.95 : 1,
                }}
              >
                {/* Drag handle — pointer down burada başlar */}
                <div
                  onPointerDown={onPointerDown(id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    background: isPicked ? 'rgba(255,255,255,0.18)' : '#faf9f5',
                    color: isPicked ? '#fff' : 'rgba(15,36,64,0.4)',
                    cursor: dragId ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                  title="Sürüklemek için bu tutamacı tut"
                >
                  <GripVertical size={16} />
                </div>

                {/* Numara */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                  style={{
                    background: isPicked ? 'rgba(255,255,255,0.18)' : 'rgba(220, 38, 38,0.1)',
                    color: isPicked ? '#fff' : '#DC2626',
                    fontFamily: 'Playfair Display, Georgia, serif',
                  }}
                >
                  {idx + 1}
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-[14px] leading-tight"
                    style={{
                      color: isPicked ? '#fff' : '#0F2440',
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontWeight: 600,
                    }}
                  >
                    {meta.tr}
                  </div>
                  <div
                    className="text-[11.5px] mt-0.5 leading-snug"
                    style={{ color: isPicked ? 'rgba(255,255,255,0.85)' : 'rgba(15,36,64,0.6)' }}
                  >
                    {meta.desc}
                  </div>
                </div>

                {/* ↑ ↓ butonları */}
                <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label="Yukarı taşı"
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                    className="w-7 h-6 rounded-md text-[11px] font-bold transition-colors disabled:opacity-30"
                    style={{
                      background: isPicked ? 'rgba(255,255,255,0.15)' : '#faf9f5',
                      color: isPicked ? '#fff' : '#0F2440',
                      border: `1px solid ${isPicked ? 'rgba(255,255,255,0.25)' : '#e8e6df'}`,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Aşağı taşı"
                    onClick={() => move(id, 1)}
                    disabled={idx === order.length - 1}
                    className="w-7 h-6 rounded-md text-[11px] font-bold transition-colors disabled:opacity-30"
                    style={{
                      background: isPicked ? 'rgba(255,255,255,0.15)' : '#faf9f5',
                      color: isPicked ? '#fff' : '#0F2440',
                      border: `1px solid ${isPicked ? 'rgba(255,255,255,0.25)' : '#e8e6df'}`,
                    }}
                  >
                    ↓
                  </button>
                </div>

                {/* Section ID */}
                <code
                  className="hidden sm:inline text-[10px] font-mono px-2 py-1 rounded shrink-0"
                  style={{
                    background: isPicked ? 'rgba(255,255,255,0.15)' : '#faf9f5',
                    color: isPicked ? 'rgba(255,255,255,0.85)' : 'rgba(15,36,64,0.45)',
                    border: `1px solid ${isPicked ? 'rgba(255,255,255,0.2)' : '#e8e6df'}`,
                  }}
                >
                  {id}
                </code>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 text-[11px]" style={{ color: 'rgba(15,36,64,0.4)' }}>
          {SORTABLE_SECTION_IDS.length} bölüm yönetiliyor · değişiklikler otomatik kaydedilir (localStorage)
        </div>
      </main>
    </div>
  );
}
