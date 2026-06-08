/**
 * Background3D — performans optimizasyonu için WebGL kaldırıldı.
 * Sadece CSS gradyanları kullanılıyor. Kasma/donma sorunu çözüldü.
 */
export function Background3D() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#FAFAFA]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.06),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(220,38,38,0.08),transparent_55%)]" />
    </div>
  );
}
