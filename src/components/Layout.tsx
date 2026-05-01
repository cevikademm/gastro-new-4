import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useCartStore } from '../stores/cartStore';
import NotificationPanel from './NotificationPanel';
import ComparePanel from './ComparePanel';
import LanguageSelector from './LanguageSelector';
import SearchCommand from './SearchCommand';
import LiveChatWidget from './LiveChatWidget';
import SiteFooter from './SiteFooter';
import {
  Bell, Settings, LayoutDashboard, Ruler, Refrigerator, Home, Search,
  SlidersHorizontal, HelpCircle, BookOpen, PlusCircle,
  Menu, X, LogOut, LogIn, User, Globe, CreditCard, FolderOpen, ShoppingCart, Pencil, Diamond, Box, Package, Palette, Shield, Users
} from 'lucide-react';

const ADMIN_ITEMS = [
  { path: '/admin/orders', labelKey: 'nav.adminOrders', fallback: 'Siparişler', icon: Shield, id: 'admin-orders' },
  { path: '/admin/users',  labelKey: 'nav.adminUsers',  fallback: 'Kullanıcılar', icon: Users, id: 'admin-users' },
];

const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'nav.project', id: 'project' },
  { path: '/design', labelKey: 'nav.design', id: 'design' },
  { path: '/support', labelKey: 'nav.contact', id: 'contact' },
  { path: '/brand', labelKey: 'nav.about', id: 'about' },
];

const SIDE_ITEMS = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, id: 'dashboard' },
  // Projeler sekmesi gizlendi — gösterge panelinde (Dashboard) zaten erişilebilir durumda.
  { path: '/manual', labelKey: 'nav.manual', icon: Pencil, id: 'manual' },
  { path: '/diamond', labelKey: 'Diamond', icon: Diamond, id: 'diamond', raw: true },
  { path: '/combisteel', labelKey: 'CombiSteel', icon: Box, id: 'combisteel', raw: true },
  { path: '/kitchen-planner', labelKey: 'AI Mutfak Planlayıcı', icon: Refrigerator, id: 'kitchen-planner', raw: true },
  { path: '/cart', labelKey: 'nav.cart', icon: ShoppingCart, id: 'cart' },
  { path: '/orders', labelKey: 'nav.myOrders', icon: Package, id: 'orders' },

  { path: '/settings', labelKey: 'nav.settings', icon: SlidersHorizontal, id: 'settings' },
  { path: '/payment', labelKey: 'nav.payment', icon: CreditCard, id: 'payment' },
  { path: '/brand', labelKey: 'nav.brand', icon: Palette, id: 'brand' },
  { path: '/blog', labelKey: 'Blog', icon: Pencil, id: 'blog', raw: true },
  { path: '/tools/kitchen-calculator', labelKey: 'Hesaplayıcı', icon: Box, id: 'calc', raw: true },
];

// Alt tab bar için sadece önemli 5 sayfa
const BOTTOM_NAV = [
  { path: '/welcome', icon: Home, labelKey: 'nav.home' },
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.panel' },
  { path: '/design', icon: Ruler, labelKey: 'nav.drawing' },
  { path: '/cart', icon: ShoppingCart, labelKey: 'nav.cart' },
  { path: '/diamond', icon: Search, labelKey: 'nav.search' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { mobileMenuOpen, toggleMobileMenu, toggleNotificationPanel, unreadCount } = useUIStore();
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Design sayfaları: tam ekran canvas gerektirir
  const isDesign = ['/design', '/manual'].some(p =>
    location.pathname === p || location.pathname.endsWith(p)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      {/* TopNavBar */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/10 flex justify-between items-center w-full px-4 md:px-6 py-3 h-16 md:h-20 fixed top-0 z-50">
        <div className="flex items-center gap-3 md:gap-8">
          {/* Hamburger sadece tablet'te (md) göster, mobilde alt nav var */}
          <button onClick={toggleMobileMenu} className="hidden md:flex lg:hidden p-2 text-on-surface hover:bg-primary/10 rounded-full">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/welcome" className="flex items-center gap-2">
            <img src="/logo-2mc-gastro.jpeg" alt="2MC Gastro" className="h-12 md:h-14 object-contain" />
          </Link>
          <nav className="hidden lg:flex gap-6 items-center">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`font-headline font-bold tracking-tight transition-colors text-sm ${
                    isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="hidden md:flex gap-2">
            <Link to="/projects" className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors rounded-lg">
              {t('nav.saveRevision')}
            </Link>
            <button className="px-3 py-1.5 text-sm font-bold text-white brushed-metal rounded-lg shadow-sm hover:opacity-90 transition-all">
              {t('nav.exportDWG')}
            </button>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 h-9 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Ara (Ctrl+K)"
          >
            <Search size={14} />
            <span>{t('nav.search', 'Ara...')}</span>
            <kbd className="ml-2 px-1.5 py-0.5 bg-white text-[9px] font-bold text-slate-500 rounded border border-slate-200">⌘K</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-1.5 text-on-surface hover:bg-primary/10 rounded-full"
            aria-label="Ara"
          >
            <Search size={18} />
          </button>
          <Link to="/cart" className="relative p-1.5 md:p-2 text-on-surface hover:bg-primary/10 rounded-full transition-colors">
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <LanguageSelector />
          <div className="relative">
            <button onClick={toggleNotificationPanel} className="p-1.5 md:p-2 text-on-surface hover:bg-primary/10 rounded-full transition-colors relative">
              <Bell size={18} />
              {unreadCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount()}
                </span>
              )}
            </button>
            <NotificationPanel />
          </div>
          <Link to="/settings" className="p-1.5 md:p-2 text-on-surface hover:bg-primary/10 rounded-full transition-colors">
            <Settings size={18} />
          </Link>
          {isAuthenticated && user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                    {(user.fullName || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-primary hidden sm:inline max-w-[100px] truncate">
                  {user.fullName || user.email}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-error bg-error-container/60 hover:bg-error-container rounded-lg transition-colors"
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-white brushed-metal rounded-lg shadow-sm hover:opacity-90 transition-all"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Tablet/Desktop Sidebar Overlay (md only) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 hidden md:flex lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={toggleMobileMenu} />
          <div className="absolute top-16 md:top-20 left-0 w-64 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-surface-container-low p-4 shadow-xl overflow-y-auto">
            <nav className="space-y-1">
              {SIDE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={toggleMobileMenu}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      isActive ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={18} /> {(item as any).raw ? item.labelKey : t(item.labelKey, { defaultValue: item.labelKey })}
                  </Link>
                );
              })}
              {user?.role === 'admin' && (
                <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-1">
                  <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('nav.admin')}</div>
                  {ADMIN_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={toggleMobileMenu}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                          isActive ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <Icon size={18} /> {t(item.labelKey, { defaultValue: item.fallback })}
                      </Link>
                    );
                  })}
                </div>
              )}
            </nav>
            <div className="mt-6 pt-4 border-t border-outline-variant/20 space-y-1">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" onClick={toggleMobileMenu} className="w-full flex items-center gap-3 text-slate-500 px-4 py-2 hover:bg-slate-200 rounded-md text-sm font-medium">
                    <User size={18} /> {t('nav.profile')}
                  </Link>
                  <button onClick={() => { toggleMobileMenu(); handleLogout(); }} className="w-full flex items-center gap-3 text-error px-4 py-2 hover:bg-error-container rounded-md text-sm font-medium">
                    <LogOut size={18} /> {t('nav.logout')}
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={toggleMobileMenu} className="w-full flex items-center gap-3 text-primary px-4 py-2 hover:bg-primary/10 rounded-md text-sm font-bold">
                  <LogIn size={18} /> {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 pt-16 md:pt-20">
        {/* Desktop Sidebar — lg ve üzeri */}
        <aside className="bg-surface-container-low fixed top-16 md:top-20 left-0 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-64 flex-col space-y-2 p-4 hidden lg:flex z-40 border-r border-outline-variant/10">
          <div className="mb-4 px-2">
            <Link to="/welcome">
              <img src="/logo-2mc-gastro.jpeg" alt="2MC Gastro" className="h-10 object-contain object-left" />
            </Link>
            <p className="font-body text-xs text-on-surface-variant mt-1 px-2">{t('brand.phase')}</p>
          </div>

          <Link
            to="/welcome"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Home size={18} />
            {t('nav.home')}
          </Link>

          <nav className="flex-1 space-y-1">
            {SIDE_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/') || (item.path === '/dashboard' && location.pathname === '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-2 transition-all duration-200 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-primary/10 text-primary border-r-4 border-primary'
                      : 'text-on-surface-variant hover:bg-primary/10 hover:translate-x-1'
                  }`}
                >
                  <Icon size={18} />
                  {(item as any).raw ? item.labelKey : t(item.labelKey, { defaultValue: item.labelKey })}
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-1">
                <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('nav.admin', 'Yönetici')}</div>
                {ADMIN_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`w-full flex items-center gap-3 px-4 py-2 transition-all duration-200 rounded-md text-sm font-medium ${
                        isActive
                          ? 'bg-primary/10 text-primary border-r-4 border-primary'
                          : 'text-on-surface-variant hover:bg-primary/10 hover:translate-x-1'
                      }`}
                    >
                      <Icon size={18} />
                      {t(item.labelKey, { defaultValue: item.fallback })}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {location.pathname === '/dashboard' && (
            <Link to="/projects/new" className="mx-4 mt-4 py-3 brushed-metal text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-transform active:scale-95 shadow-lg text-sm">
              <PlusCircle size={18} /> {t('nav.newSpecification')}
            </Link>
          )}

          <div className="mt-auto pt-4 space-y-1 border-t border-outline-variant/20">
            <Link to="/support" className="w-full flex items-center gap-3 text-slate-500 px-4 py-2 hover:bg-slate-200 transition-all rounded-md text-sm font-medium">
              <HelpCircle size={18} /> {t('nav.support')}
            </Link>
            <Link to="/docs" className="w-full flex items-center gap-3 text-slate-500 px-4 py-2 hover:bg-slate-200 transition-all rounded-md text-sm font-medium">
              <BookOpen size={18} /> {t('nav.documentation')}
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="w-full flex items-center gap-3 text-slate-500 px-4 py-2 hover:bg-slate-200 transition-all rounded-md text-sm font-medium">
                  <User size={18} /> {t('nav.profile')}
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 text-error px-4 py-2 hover:bg-error-container transition-all rounded-md text-sm font-medium">
                  <LogOut size={18} /> {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link to="/login" className="w-full flex items-center gap-3 text-primary px-4 py-2 hover:bg-primary/10 transition-all rounded-md text-sm font-bold">
                <LogIn size={18} /> {t('nav.login')}
              </Link>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={[
            'flex-1 flex flex-col min-w-0',
            isDesign
              ? 'lg:ml-64 overflow-hidden'
              : 'lg:ml-64 p-4 md:p-6 lg:p-8 pb-20 md:pb-8',
          ].join(' ')}
          style={isDesign ? { height: 'calc(100dvh - 4rem)' } : undefined}
        >
          <Outlet />
        </main>
      </div>

      {!isDesign && <SiteFooter />}

      {/* Mobile Bottom Navigation — sadece telefon (<md) */}
      {!isDesign && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-500'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[9px] font-bold">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Global Compare Panel */}
      <ComparePanel />

      {/* Global CMD+K Search */}
      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Global AI Live Chat */}
      <LiveChatWidget />
    </div>
  );
}
