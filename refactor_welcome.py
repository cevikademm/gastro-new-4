import os
import re

file_path = '/home/efe/Masaüstü/gastro-new-4/src/pages/auth/WelcomePage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Update brand colors globally
# Old: #7B1F26, rgba(123, 31, 38)
# New: #E85D26, rgba(232, 93, 38)
content = "".join(lines)
content = content.replace('#7B1F26', '#E85D26')
content = content.replace('123,31,38', '232,93,38')
content = content.replace('123, 31, 38', '232, 93, 38')
content = content.replace('#5A1219', '#C44A1A') # koyu aksan
content = content.replace('#A04654', '#FF7A45') # açık aksan

# 2. Add fuse.js import
if 'import Fuse from "fuse.js"' not in content:
    content = 'import Fuse from "fuse.js";\n' + content

# 3. Implement search logic
search_logic = """
  // ── SEARCH INDEXING (fuse.js) ──
  const fuse = useMemo(() => {
    return new Fuse(productsData, {
      keys: ['name', 'id', 'cat'],
      threshold: 0.3,
      distance: 100,
    });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const results = fuse.search(searchQuery).slice(0, 8);
      setSearchResults(results.map(r => r.item));
      setShowSearchDropdown(true);
    } else {
      setShowSearchDropdown(false);
    }
  }, [searchQuery, fuse]);
"""

# Inject search logic after pickBestsellerBatch
content = re.sub(r'(const pickBestsellerBatch = .*?};)', r'\1' + search_logic, content, flags=re.DOTALL)

# 4. Remove duplications (Hero and Trust)
# I will find the first occurrence of Hero and Trust and remove subsequent ones.
hero_pattern = r'<section className="relative min-h-\[90vh\].*?</section>'
trust_pattern = r'<section className="bg-white/5 backdrop-blur-3xl py-10.*?/section>'

# Keep first, remove others
content = re.sub(hero_pattern, r'__HERO_MARKER__', content, flags=re.DOTALL)
content = content.replace('__HERO_MARKER__', re.findall(hero_pattern, content, flags=re.DOTALL)[0], 1)
content = content.replace('__HERO_MARKER__', '')

content = re.sub(trust_pattern, r'__TRUST_MARKER__', content, flags=re.DOTALL)
content = content.replace('__TRUST_MARKER__', re.findall(trust_pattern, content, flags=re.DOTALL)[0], 1)
content = content.replace('__TRUST_MARKER__', '')

# 5. Fix Search Dropdown UI in Header
search_dropdown_ui = """
                <input
                  name="q"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  onFocus={() => searchQuery.length > 2 && setShowSearchDropdown(true)}
                  placeholder={t('welcome.header.searchPh', 'Mükemmelliği arayın…')}
                  className="w-full py-3.5 pl-14 pr-24 text-sm bg-white/5 border border-white/10 rounded-2xl outline-none transition-all focus:bg-white/10 focus:border-[#E85D26]/50 focus:ring-4 focus:ring-[#E85D26]/10 text-white placeholder:text-white/20"
                />
                <AnimatePresence>
                  {showSearchDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 p-4 bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => navigate(`/diamond?q=${encodeURIComponent(p.id)}`)}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shrink-0">
                              <img src={p.img} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{p.name}</div>
                              <div className="text-[10px] text-white/40 uppercase tracking-widest">{p.cat}</div>
                            </div>
                            <div className="text-sm font-black text-[#E85D26]">{p.price.toLocaleString('de-DE')} €</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
"""

content = re.sub(r'<input.*?placeholder={t\(\'welcome.header.searchPh\', \'Mükemmelliği arayın…\'\)}.*?/>', search_dropdown_ui, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactor complete.")
