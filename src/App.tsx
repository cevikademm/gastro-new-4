import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CookieBanner from './components/CookieBanner';
import { useAuthStore } from './stores/authStore';

// Eager: minimal shell
import AdminGuard from './components/AdminGuard';
import AnalyticsListener from './components/AnalyticsListener';
import NotFoundPage from './pages/NotFoundPage';
import ScrollProgress from './components/ScrollProgress';
import RevealOnScroll from './components/RevealOnScroll';

// Lazy: all pages
const WelcomePage = lazy(() => import('./pages/auth/WelcomePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const PendingApprovalPage = lazy(() => import('./pages/auth/PendingApprovalPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));

// Lazy: everything else — code-split per route
const DesignStudio = lazy(() => import('./components/DesignStudio'));
const BOM = lazy(() => import('./components/BOM'));
const Cart = lazy(() => import('./components/Cart'));
const ProjectListPage = lazy(() => import('./pages/projects/ProjectListPage'));
const NewProjectPage = lazy(() => import('./pages/projects/NewProjectPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const AddProductPage = lazy(() => import('./pages/products/AddProductPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const SupportPage = lazy(() => import('./pages/support/SupportPage'));
const DocsPage = lazy(() => import('./pages/docs/DocsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const PaymentPage = lazy(() => import('./pages/payment/PaymentPage'));
const DiamondPage = lazy(() => import('./pages/diamond/DiamondPage'));
const ProductDetailPage = lazy(() => import('./pages/product/ProductDetailPage'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const KitchenPlannerPage = lazy(() => import('./pages/planner/KitchenPlannerPage'));
const CombiSteelPage = lazy(() => import('./pages/combisteel/CombiSteelPage'));
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'));
const BrandPage = lazy(() => import('./pages/brand/BrandPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const BlogAdminPage = lazy(() => import('./pages/admin/BlogAdminPage'));
const WelcomeOrderPage = lazy(() => import('./pages/admin/WelcomeOrderPage'));
const BlogListPage = lazy(() => import('./pages/blog/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/blog/BlogPostPage'));
const KitchenCalculatorPage = lazy(() => import('./pages/tools/KitchenCalculatorPage'));
const SegmentIndexPage = lazy(() => import('./pages/pseo/SegmentIndexPage'));
const SegmentCityPage = lazy(() => import('./pages/pseo/SegmentCityPage'));
const CategoryIndexPage = lazy(() => import('./pages/pseo/CategoryIndexPage'));
const CategoryCityPage = lazy(() => import('./pages/pseo/CategoryCityPage'));
const BrandSeoPage = lazy(() => import('./pages/pseo/BrandPage'));
const CompareIndexPage = lazy(() => import('./pages/compare/CompareIndexPage'));
const CompareDetailPage = lazy(() => import('./pages/compare/CompareDetailPage'));
const ResourcesPage = lazy(() => import('./pages/resources/ResourcesPage'));
import LandingPage from './pages/landing/LandingPage';
const FloorPlan3DPage = lazy(() => import('./pages/design/FloorPlan3DPage'));

function RouteFallback() {
  return (
    <div className="fixed inset-0 bg-[#0e0e10] flex flex-col items-center justify-center z-[9999]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-t-2 border-brand-red rounded-full animate-spin shadow-[0_0_15px_rgba(232,93,38,0.2)]" />
        <span className="text-xl font-display font-bold tracking-tighter text-white uppercase">2MC GASTRO</span>
      </div>
    </div>
  );
}

export default function App() {
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <BrowserRouter>
      <AnalyticsListener />
      <ScrollProgress />
      <RevealOnScroll />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Welcome & Auth routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/old-welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/forgot-password" element={<LoginPage />} />

          {/* Main routes - publicly accessible */}
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="design" element={<DesignStudio />} />
            <Route path="design/3d" element={<FloorPlan3DPage />} />
            <Route path="manual" element={<DesignStudio manualMode />} />
            <Route path="bom" element={<BOM />} />
            <Route path="bom/:id" element={<BOM />} />
            <Route path="diamond" element={<DiamondPage />} />
            <Route path="combisteel" element={<CombiSteelPage />} />
            <Route path="product/:id" element={<ProductDetailPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="kitchen-planner" element={<KitchenPlannerPage />} />
            <Route path="cart" element={<Cart />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />

            <Route path="projects" element={<ProjectListPage />} />
            <Route path="projects/new" element={<NewProjectPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:projectId/products/add" element={<AddProductPage />} />
            <Route path="projects/:id/design" element={<DesignStudio />} />
            <Route path="projects/:id/design/3d" element={<FloorPlan3DPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="brand" element={<BrandPage />} />

            <Route path="blog" element={<BlogListPage />} />
            <Route path="blog/:slug" element={<BlogPostPage />} />
            <Route path="tools/kitchen-calculator" element={<KitchenCalculatorPage />} />
            <Route path="sektor/:segment" element={<SegmentIndexPage />} />
            <Route path="sektor/:segment/:city" element={<SegmentCityPage />} />
            <Route path="de/branche/:segment/:city" element={<SegmentCityPage locale="de" />} />
            <Route path="en/industry/:segment/:city" element={<SegmentCityPage locale="en" />} />
            <Route path="kategori" element={<CategoryIndexPage />} />
            <Route path="kategori/:category" element={<CategoryIndexPage />} />
            <Route path="kategori/:category/:city" element={<CategoryCityPage />} />
            <Route path="marka" element={<BrandSeoPage />} />
            <Route path="marka/:brand" element={<BrandSeoPage />} />
            <Route path="marka/:brand/:category" element={<BrandSeoPage />} />

            <Route path="compare" element={<CompareIndexPage />} />
            <Route path="compare/:slug" element={<CompareDetailPage />} />
            <Route path="resources" element={<ResourcesPage />} />

            <Route path="admin/orders" element={<AdminGuard><AdminOrdersPage /></AdminGuard>} />
            <Route path="admin/users"  element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
            <Route path="admin/blog"   element={<AdminGuard><BlogAdminPage /></AdminGuard>} />
            <Route path="admin/welcome-order" element={<AdminGuard><WelcomeOrderPage /></AdminGuard>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </BrowserRouter>
  );
}
