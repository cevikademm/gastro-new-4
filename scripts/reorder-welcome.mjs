// One-shot script: move HERO + BESTSELLERS to end of WelcomePage,
// so banner is followed by bestsellers at page bottom.
import fs from 'node:fs';

const path = 'src/pages/auth/WelcomePage.tsx';
const src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

const idx = (needle) => {
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(needle)) return i;
  return -1;
};

// HERO section markers
const heroStart = idx('3 — HERO') - 1; // include opening comment block "{/*..."
const heroSectionStartLine = idx('3 — HERO');
// find closing </section> after THEMENWELTEN start
const themenIdx = idx('4 — THEMENWELTEN');
// the </section> right before the {/* themenwelten comment opening is hero close
// find blank line directly before themenwelten comment
let heroEnd = themenIdx;
while (heroEnd > 0 && !lines[heroEnd - 1].includes('</section>')) heroEnd--;
heroEnd -= 1; // index of </section>

// BESTSELLER section markers
const bestStart = idx('9 — BESTSELLERS') - 1;
const catalogIdx = idx('10 — CATALOG BANNER');
let bestEnd = catalogIdx;
while (bestEnd > 0 && !lines[bestEnd - 1].includes('</section>')) bestEnd--;
bestEnd -= 1;

console.log('HERO range:', heroStart + 1, '→', heroEnd + 1);
console.log('BEST range:', bestStart + 1, '→', bestEnd + 1);

// Slice (1-based to 0-based — we already use 0-based above)
const hero = lines.slice(heroStart, heroEnd + 1);
const bestseller = lines.slice(bestStart, bestEnd + 1);

// Find LiveChatWidget insertion point
const lcwCommentIdx = idx('{/* AI Live Chat */}');
console.log('LiveChatWidget comment line:', lcwCommentIdx + 1);

// Build new line list: remove hero & bestseller from their positions, insert before LiveChatWidget.
// To avoid index drift, we splice a sorted set of removals once.
const removals = [
  { from: heroStart, to: heroEnd },
  { from: bestStart, to: bestEnd },
].sort((a, b) => b.from - a.from); // remove from end first

let out = [...lines];
for (const r of removals) {
  // also strip the trailing blank line after the section (if it exists)
  let to = r.to;
  if (to + 1 < out.length && out[to + 1] === '') to += 1;
  out.splice(r.from, to - r.from + 1);
}

// recalculate LiveChatWidget index in `out`
const lcwIdx2 = out.findIndex((l) => l.includes('{/* AI Live Chat */}'));
console.log('Insert at line (in trimmed):', lcwIdx2 + 1);

// Insert: hero block + blank + bestseller block + blank, before LiveChatWidget comment
const insertion = [...hero, '', ...bestseller, ''];
out.splice(lcwIdx2, 0, ...insertion);

fs.writeFileSync(path, out.join('\n'));
console.log('Done. New total lines:', out.length);
