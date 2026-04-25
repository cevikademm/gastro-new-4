import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CookieBanner from './components/CookieBanner';
import { useAuthStore } from './stores/authStore';

// Eager: auth + shell critical path
import WelcomePage from './pages/auth/WelcomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PendingApprovalPage from './pages/auth/PendingApprovalPage';
import Dashboard from './components/Dashboard';
import NotFoundPage from './pages/NotFoundPage';
import AdminGuard from './components/AdminGuard';
import AnalyticsListener from './components/AnalyticsListener';

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
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const FloorPlan3DPage = lazy(() => import('./pages/design/FloorPlan3DPage'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] text-slate-400 text-sm">
      Yükleniyor…
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Welcome & Auth routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/forgot-password" element={<LoginPage />} />

          {/* Main routes - publicly accessible */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/welcome" replace />} />
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
