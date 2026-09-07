/**
 * DXF dışa aktarma — 2B kat planını AutoCAD R12 (AC1009) DXF olarak yazar.
 *
 * Neden DXF (DWG değil)? `@mlightcad/libredwg-web` paketinin varsayılan WASM
 * derlemesi DWG YAZMA desteği olmadan gelir (README: "disable-write"); DXF ise
 * AutoCAD, BricsCAD, LibreCAD, DraftSight vb. tüm CAD araçlarında doğrudan açılır.
 *
 * İçerik (katman → varlık):
 *  - WALLS      : duvar kalınlığı kadar kapalı POLYLINE (dikdörtgen)
 *  - OPENINGS   : kapı/pencere/servis açıklığı — duvar üzerinde çizgi + kenar tikleri
 *  - EQUIPMENT  : ürün ayak izi (döndürülmüş dikdörtgen)
 *  - LABELS     : ürün adları (TEXT)
 *  - ROOMS      : oda adları (TEXT, ağırlık merkezinde)
 *
 * Birim mm ($INSUNITS=4). Konva'nın Y-aşağı plan uzayı CAD'in Y-yukarı uzayına
 * aynalanır (y → -y) — böylece çizim CAD'de düz açılır (bkz. renderSpace.ts).
 */

import type { ProjectDocument, Vec2 } from '../../../core/types';
import { wallBandPolygons } from '../../../core/wallBands';
import { useProjectStore } from '../../../store/projectStore';

interface Pt { x: number; y: number }

const LAYERS: ReadonlyArray<{ name: string; color: number }> = [
  { name: 'WALLS', color: 7 },
  { name: 'OPENINGS', color: 3 },
  { name: 'EQUIPMENT', color: 1 },
  { name: 'LABELS', color: 2 },
  { name: 'ROOMS', color: 4 },
];

/** Plan uzayı → CAD uzayı (Y aynalama). */
const toCad = (p: Vec2 | Pt): Pt => ({ x: p.x, y: -p.y });
const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();
const finite = (p: Pt): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);

class DxfWriter {
  private readonly lines: string[] = [];
  private min: Pt = { x: Infinity, y: Infinity };
  private max: Pt = { x: -Infinity, y: -Infinity };

  private pair(code: number, value: string | number): void {
    this.lines.push(String(code), typeof value === 'number' ? fmt(value) : value);
  }

  private track(p: Pt): void {
    if (p.x < this.min.x) this.min.x = p.x;
    if (p.y < this.min.y) this.min.y = p.y;
    if (p.x > this.max.x) this.max.x = p.x;
    if (p.y > this.max.y) this.max.y = p.y;
  }

  line(layer: string, a: Pt, b: Pt): void {
    if (!finite(a) || !finite(b)) return;
    this.track(a); this.track(b);
    this.pair(0, 'LINE'); this.pair(8, layer);
    this.pair(10, a.x); this.pair(20, a.y); this.pair(30, 0);
    this.pair(11, b.x); this.pair(21, b.y); this.pair(31, 0);
  }

  polyline(layer: string, pts: Pt[], closed = true): void {
    const valid = pts.filter(finite);
    if (valid.length < 2) return;
    valid.forEach((p) => this.track(p));
    this.pair(0, 'POLYLINE'); this.pair(8, layer); this.pair(66, 1); this.pair(70, closed ? 1 : 0);
    for (const p of valid) {
      this.pair(0, 'VERTEX'); this.pair(8, layer);
      this.pair(10, p.x); this.pair(20, p.y); this.pair(30, 0);
    }
    this.pair(0, 'SEQEND'); this.pair(8, layer);
  }

  text(layer: string, at: Pt, height: number, value: string, rotationDeg = 0): void {
    const clean = value.replace(/[\r\n]+/g, ' ').trim();
    if (!clean || !finite(at)) return;
    this.track(at);
    this.pair(0, 'TEXT'); this.pair(8, layer);
    this.pair(10, at.x); this.pair(20, at.y); this.pair(30, 0);
    this.pair(40, height); this.pair(1, clean);
    if (rotationDeg) this.pair(50, rotationDeg);
    // Yatay/dikey hizalama: orta (72=1, 73=2) — ikinci hizalama noktası gerekir
    this.pair(72, 1); this.pair(73, 2);
    this.pair(11, at.x); this.pair(21, at.y); this.pair(31, 0);
  }

  build(): string {
    const hasExtent = Number.isFinite(this.min.x);
    const min = hasExtent ? this.min : { x: 0, y: 0 };
    const max = hasExtent ? this.max : { x: 0, y: 0 };
    const head: string[] = [];
    const h = (code: number, value: string | number) => head.push(String(code), typeof value === 'number' ? fmt(value) : value);
    h(0, 'SECTION'); h(2, 'HEADER');
    h(9, '$ACADVER'); h(1, 'AC1009');
    h(9, '$INSUNITS'); h(70, 4);
    h(9, '$EXTMIN'); h(10, min.x); h(20, min.y); h(30, 0);
    h(9, '$EXTMAX'); h(10, max.x); h(20, max.y); h(30, 0);
    h(0, 'ENDSEC');
    // Tablolar: çizgi tipi + katmanlar
    h(0, 'SECTION'); h(2, 'TABLES');
    h(0, 'TABLE'); h(2, 'LTYPE'); h(70, 1);
    h(0, 'LTYPE'); h(2, 'CONTINUOUS'); h(70, 0); h(3, 'Solid line'); h(72, 65); h(73, 0); h(40, 0);
    h(0, 'ENDTAB');
    h(0, 'TABLE'); h(2, 'LAYER'); h(70, LAYERS.length);
    for (const l of LAYERS) { h(0, 'LAYER'); h(2, l.name); h(70, 0); h(62, l.color); h(6, 'CONTINUOUS'); }
    h(0, 'ENDTAB');
    h(0, 'ENDSEC');
    h(0, 'SECTION'); h(2, 'ENTITIES');
    const tail = ['0', 'ENDSEC', '0', 'EOF'];
    return [...head, ...this.lines, ...tail].join('\r\n') + '\r\n';
  }
}

/** Dışa aktarılacak geometri var mı? (boş projede indirme başlatmayalım) */
export function hasExportableGeometry(project: ProjectDocument): boolean {
  return Object.keys(project.walls).length > 0 || Object.keys(project.equipment).length > 0;
}

/** Projeyi DXF metnine çevirir. */
export function projectToDxf(project: ProjectDocument): string {
  const w = new DxfWriter();
  const V = project.vertices;
  // Duvar bantları — 2B/3B ile aynı köşe birleşimleri (mitre, T, serbest uç).
  const { bands } = wallBandPolygons(project);

  // Duvarlar — kalınlık kadar (köşeleri birleştirilmiş) poligon
  for (const wall of Object.values(project.walls)) {
    const a = V[wall.a]; const b = V[wall.b];
    if (!a || !b) continue;
    const dx = b.x - a.x; const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len; const uy = dy / len;
    const half = Math.max(wall.thickness, 1) / 2;
    const nx = -uy * half; const ny = ux * half;
    const band = bands.get(wall.id);
    w.polyline(
      'WALLS',
      band
        ? band.polygon.map(toCad)
        : [
            toCad({ x: a.x + nx, y: a.y + ny }),
            toCad({ x: b.x + nx, y: b.y + ny }),
            toCad({ x: b.x - nx, y: b.y - ny }),
            toCad({ x: a.x - nx, y: a.y - ny }),
          ],
    );

    // Bu duvardaki açıklıklar
    for (const op of Object.values(project.openings)) {
      if (op.wallId !== wall.id) continue;
      const s = { x: a.x + ux * op.offset, y: a.y + uy * op.offset };
      const e = { x: a.x + ux * (op.offset + op.width), y: a.y + uy * (op.offset + op.width) };
      w.line('OPENINGS', toCad(s), toCad(e));
      // Kenar tikleri (duvar kalınlığı boyunca)
      w.line('OPENINGS', toCad({ x: s.x + nx, y: s.y + ny }), toCad({ x: s.x - nx, y: s.y - ny }));
      w.line('OPENINGS', toCad({ x: e.x + nx, y: e.y + ny }), toCad({ x: e.x - nx, y: e.y - ny }));
      const label = op.kind === 'door' ? 'K' : op.kind === 'window' ? 'P' : 'S';
      const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      w.text('OPENINGS', toCad(mid), Math.min(120, Math.max(60, op.width / 8)), `${label} ${Math.round(op.width)}`);
    }
  }

  // Ekipman — döndürülmüş ayak izi + ad
  for (const eq of Object.values(project.equipment)) {
    const cx = eq.position.x; const cy = eq.position.y;
    const hw = eq.footprint.width / 2; const hd = eq.footprint.depth / 2;
    const c = Math.cos(eq.rotation || 0); const s = Math.sin(eq.rotation || 0);
    const corner = (lx: number, ly: number): Pt => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
    w.polyline('EQUIPMENT', [corner(-hw, -hd), corner(hw, -hd), corner(hw, hd), corner(-hw, hd)].map(toCad));
    // Ön kenar işareti (çizimde yönü belli etsin): ön = +derinlik kenarı
    w.line('EQUIPMENT', toCad(corner(-hw * 0.5, hd)), toCad(corner(hw * 0.5, hd)));
    const textH = Math.min(150, Math.max(60, Math.min(eq.footprint.width, eq.footprint.depth) / 6));
    // Y aynalandığı için açı işareti ters döner
    const deg = -((eq.rotation || 0) * 180) / Math.PI;
    w.text('LABELS', toCad({ x: cx, y: cy }), textH, eq.name, deg);
  }

  // Oda adları — döngüdeki köşe noktalarının ortalaması
  for (const room of Object.values(project.rooms)) {
    const seen = new Set<string>();
    let sx = 0; let sy = 0; let n = 0;
    for (const wid of room.wallLoop) {
      const wall = project.walls[wid];
      if (!wall) continue;
      for (const vid of [wall.a, wall.b]) {
        if (seen.has(vid)) continue;
        const v = V[vid]; if (!v) continue;
        seen.add(vid); sx += v.x; sy += v.y; n++;
      }
    }
    if (n === 0) continue;
    w.text('ROOMS', toCad({ x: sx / n, y: sy / n }), 200, room.name);
  }

  return w.build();
}

function safeFileName(name: string): string {
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 80);
  return (base || 'kat-plani') + '.dxf';
}

/** DXF dosyasını tarayıcıdan indirtir. */
export function downloadDxf(project: ProjectDocument): void {
  const blob = new Blob([projectToDxf(project)], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(project.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Üst çubuktaki "DXF Dışa Aktar" düğmesi için: açık olan tasarımı indirir.
 * Dışa aktarılacak geometri yoksa `false` döner (çağıran tasarımcıya yönlendirir).
 */
export function exportCurrentDesignDxf(): boolean {
  const { project } = useProjectStore.getState();
  if (!project || !hasExportableGeometry(project)) return false;
  downloadDxf(project);
  return true;
}
