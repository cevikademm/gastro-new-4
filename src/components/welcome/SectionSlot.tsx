import type { ReactNode } from 'react';
import { useWelcomeOrderStore, type WelcomeSectionId } from '../../stores/welcomeOrderStore';

/**
 * Sıralanabilir karşılama-sayfası bölümünü saran wrapper.
 * Görsel sırayı CSS flex `order` ile değiştirir — React ağacı dokunmaz,
 * yani çocuk bileşenler (motion, video, 3D viewer, random rotation hooks)
 * yeniden mount olmaz, state korunur.
 *
 * Sıra `welcomeOrderStore` üzerinden gelir (localStorage'da kalıcı).
 */
interface Props {
  id: WelcomeSectionId;
  children: ReactNode;
}

export default function SectionSlot({ id, children }: Props) {
  const order = useWelcomeOrderStore((s) => s.order);
  const idx = order.indexOf(id);
  // 100+ offset — sabit bölümlerin (USP=0, Header=0) önüne geçmemesi için
  const flexOrder = idx >= 0 ? idx + 100 : 999;

  return (
    <div data-section-id={id} className="w-full" style={{ order: flexOrder }}>
      {children}
    </div>
  );
}
