import { describe, it, expect } from 'vitest';
import { searchProducts, tokenizeQuery, normalizeText } from '../productSearch';
import productsData from '../../data/products.json';

interface TestProduct {
  id: string;
  name: string;
  desc: string;
  brand: string;
  sub: string;
  fam: string;
}

const products = productsData as unknown as TestProduct[];

const item = (over: Partial<TestProduct>): TestProduct => ({
  id: 'X-1', name: '', desc: '', brand: '', sub: '', fam: '', ...over,
});

describe('normalizeText', () => {
  it('aksanları düşürür — umlaut olmadan yazınca da eşleşir', () => {
    expect(normalizeText('Kühlschrank')).toBe('kuhlschrank');
    expect(normalizeText('Große Gasherd')).toBe('grosse gasherd');
  });

  it('noktalama/ayraçları boşluğa çevirir', () => {
    expect(normalizeText('AS-70/60')).toBe('as 70 60');
  });
});

describe('tokenizeQuery', () => {
  it('çok sözcüklü sorguyu kelimelere böler', () => {
    expect(tokenizeQuery('gasherd commercial')).toEqual(['gasherd', 'commercial']);
  });

  it('fazla boşluk ve tekrarları temizler', () => {
    expect(tokenizeQuery('  gasherd   gasherd ')).toEqual(['gasherd']);
    expect(tokenizeQuery('   ')).toEqual([]);
  });
});

describe('searchProducts — sözdizimi', () => {
  const list = [
    item({ id: 'A', name: 'Gasherd 4 Brenner', desc: 'Profi Gasherd', brand: 'Diamond' }),
    item({ id: 'B', name: 'Elektroherd', desc: 'commercial kitchen', brand: 'CombiSteel' }),
    item({ id: 'C', name: 'Kühlschrank 700', desc: 'Edelstahl', brand: 'HENDI' }),
  ];

  it('boş sorguda listeyi olduğu gibi döner', () => {
    const r = searchProducts(list, '   ');
    expect(r.items).toHaveLength(3);
    expect(r.partial).toBe(false);
  });

  it('tek kelimede eşleşenleri süzer', () => {
    const r = searchProducts(list, 'gasherd');
    expect(r.items.map((i) => i.id)).toEqual(['A']);
    expect(r.partial).toBe(false);
  });

  it('tüm kelimeler eşleşiyorsa katı sonuç verir (gürültü yok)', () => {
    const r = searchProducts(list, 'gasherd brenner');
    expect(r.items.map((i) => i.id)).toEqual(['A']);
    expect(r.partial).toBe(false);
  });

  it('korpüste hiç geçmeyen kelime aramayı öldürmez, düşürülür', () => {
    const r = searchProducts(list, 'gasherd zzzznope');
    expect(r.items.map((i) => i.id)).toEqual(['A']);
    expect(r.terms).toEqual(['gasherd']);
    expect(r.partial).toBe(true);
  });

  it('kelimeler ayrı ayrı geçiyor ama birlikte geçmiyorsa en yakın sonuçları verir', () => {
    const r = searchProducts(list, 'gasherd commercial');
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.partial).toBe(true);
    // İlk kelime daha ağır puanlanır → "Gasherd" eşleşmesi başa gelir.
    expect(r.items[0].id).toBe('A');
  });

  it('umlaut yazılmasa da bulur', () => {
    expect(searchProducts(list, 'kuhlschrank').items.map((i) => i.id)).toEqual(['C']);
  });

  it('hiçbir kelime eşleşmezse boş döner', () => {
    const r = searchProducts(list, 'zzzznope xxxnope');
    expect(r.items).toHaveLength(0);
    expect(r.partial).toBe(false);
  });
});

describe('searchProducts — gerçek katalog (kabul kriterleri)', () => {
  it('"gasherd" ürün getirir', () => {
    expect(searchProducts(products, 'gasherd').items.length).toBeGreaterThan(0);
  });

  it('"gasherd commercial" boş sonuç DÖNMEZ (bildirilen hata)', () => {
    const r = searchProducts(products, 'gasherd commercial');
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.some((i) => normalizeText(i.name ?? '').includes('gasherd'))).toBe(true);
  });

  it('yazarken araya boşluk girmesi sonuçları silmez', () => {
    const typed = ['gasherd', 'gasherd ', 'gasherd c', 'gasherd co', 'gasherd commercial'];
    for (const q of typed) {
      expect(searchProducts(products, q).items.length, `sorgu: "${q}"`).toBeGreaterThan(0);
    }
  });

  it('boş sorguda tüm ürünler listelenir', () => {
    expect(searchProducts(products, '').items).toHaveLength(products.length);
  });
});

describe('searchProducts — Türkçe sorgu (ürün verisi Almanca/NL/EN)', () => {
  // Arayüz 15 dilde ama katalog metinleri Almanca/Felemenkçe/İngilizce. Eşanlamlı
  // katmanı olmadan Türk kullanıcının yazdığı her terim SIFIR sonuç dönüyordu.
  const TR_TERIMLER = [
    'fritöz', 'buzdolabı', 'bulaşık makinesi', 'fırın', 'ocak', 'dolap',
    'tezgah', 'davlumbaz', 'dondurucu', 'soğutucu', 'raf', 'bıçak',
    'kahve', 'hamur', 'ızgara', 'mikrodalga', 'evye', 'vitrin', 'şoklama',
  ];

  it.each(TR_TERIMLER)('"%s" sonuç getirir', (terim) => {
    expect(searchProducts(products, terim).items.length).toBeGreaterThan(0);
  });

  it('"fritöz" gerçekten Fritteuse/friteuse ürünlerini getirir', () => {
    const r = searchProducts(products, 'fritöz');
    const hit = r.items.some((i) => /frit|fry/i.test(normalizeText(i.name ?? '')));
    expect(hit).toBe(true);
  });

  it('Almanca sorgular eşanlamlı katmanından etkilenmez', () => {
    expect(searchProducts(products, 'fritteuse').items.length).toBeGreaterThan(0);
    expect(searchProducts(products, 'kühlschrank').items.length).toBeGreaterThan(0);
  });

  it('anlamsız sorgu yine boş döner (eşanlamlılar her şeyi eşleştirmiyor)', () => {
    expect(searchProducts(products, 'xyzqqq').items).toHaveLength(0);
  });
});
