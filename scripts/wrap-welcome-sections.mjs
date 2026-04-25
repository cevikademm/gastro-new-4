// One-shot: WelcomePage.tsx içindeki 13 sıralanabilir bölümü <SectionSlot id="..."> ile sar.
// USP, Header, LiveChat, Footer, 3D modal sabit kalır.
import fs from 'node:fs';

const path = 'src/pages/auth/WelcomePage.tsx';
const src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

// Section başlangıçlarını yorumdaki numaradan tanı.
// Marker: line ile "{/* ═" ile başlayan ve sonraki 1-3 satırda "N — TITLE" geçen yorum bloğu
const SECTION_MAP = [
  { num: '4',    id: 'themenwelten'    },
  { num: '5',    id: 'services'        },
  { num: '6',    id: 'why-2mc'         },
  { num: '6.5',  id: 'references'      },
  { num: '7',    id: 'logistics'       },
  { num: '8',    id: 'showcase-3d'     },
  { num: '10',   id: 'catalog-banner'  },
  { num: '11',   id: 'value-prop'      },
  { num: '12',   id: 'support-reviews' },
  { num: '13',   id: 'blog-newsletter' },
  { num: '14',   id: 'payment'         },
  { num: '3',    id: 'hero'            },
  { num: '9',    id: 'bestsellers'     },
];

// Bölüm sınırlarını hesapla: her marker'ın yorumu, içeriği ve closing'i.
// Marker pattern: yorum satırı sonraki satırda "    N — " ile başlayan TR yazıyla.
const markers = [];
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  if (!ln.trim().startsWith('{/* ═')) continue;
  // Sonraki 1-3 satırda "N — " arıyoruz
  for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
    const m = lines[j].match(/^\s*(\d+(?:\.\d+)?)\s+—\s+(.+)$/);
    if (m) {
      markers.push({ commentLine: i, num: m[1], title: m[2].trim() });
      break;
    }
  }
}

console.log('Bulunan markerlar:', markers.map((m) => `${m.num} — ${m.title}`).join('\n  '));

// Her marker için id eşle
const annotated = markers
  .map((m) => {
    const found = SECTION_MAP.find((s) => s.num === m.num);
    return found ? { ...m, id: found.id } : null;
  })
  .filter(Boolean);

console.log(`\n${annotated.length} bölüm sarılacak.`);

// Şimdi her bölüm için:
//   - başlangıç: yorum satırından (commentLine) hemen önce <SectionSlot id="X">
//   - bitiş: bir sonraki marker'ın commentLine'ından hemen önce </SectionSlot>
// (son bölüm için bitiş = LiveChatWidget'tan önce)
const lcwIdx = lines.findIndex((l) => l.includes('{/* AI Live Chat */}'));
console.log('LiveChatWidget yorumu satırı:', lcwIdx + 1);

// Bitişleri sırayla hesapla
const sortedMarkers = [...annotated].sort((a, b) => a.commentLine - b.commentLine);

// İşaretleri tersten ekle ki indexler kaymasın.
// Opener: yorum bloğunun BİTİŞİNDEN sonra (yani ilk JSX satırının önüne).
// Closer: bir sonraki bölümün yorum bloğundan ÖNCE.
const insertions = []; // { line, text } — line index'inden önce eklenecek satırlar
for (let i = 0; i < sortedMarkers.length; i++) {
  const cur = sortedMarkers[i];
  const next = sortedMarkers[i + 1];
  const indent = lines[cur.commentLine].match(/^\s*/)[0];

  // Yorum bloğunun bittiği satır: ilk "*/}" içeren satır (cur.commentLine'dan itibaren)
  let cbe = cur.commentLine;
  while (cbe < lines.length && !lines[cbe].includes('*/}')) cbe++;

  const openerLine = cbe + 1;                                     // yorum bittikten sonra
  const closerLine = next ? next.commentLine : lcwIdx;            // sonraki yorum bloğundan önce

  insertions.push({ line: openerLine, text: `${indent}<SectionSlot id="${cur.id}">` });
  insertions.push({ line: closerLine, text: `${indent}</SectionSlot>` });
}

// İndeks kaymasını engellemek için tersten uygula (büyük line numaralarından başla)
insertions.sort((a, b) => b.line - a.line);

let out = [...lines];
for (const ins of insertions) {
  out.splice(ins.line, 0, ins.text);
}

// Import ekle (zaten yoksa)
const importLine = "import SectionSlot from '../../components/welcome/SectionSlot';";
const hasImport = out.some((l) => l.includes("from '../../components/welcome/SectionSlot'"));
if (!hasImport) {
  // Son `import` satırından sonra ekle
  let lastImportIdx = -1;
  for (let i = 0; i < out.length; i++) {
    if (out[i].startsWith('import ')) lastImportIdx = i;
    else if (out[i].trim() === '' && lastImportIdx >= 0) break;
  }
  out.splice(lastImportIdx + 1, 0, importLine);
}

fs.writeFileSync(path, out.join('\n'));
console.log('Tamamlandı. Toplam satır:', out.length);
