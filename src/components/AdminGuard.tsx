import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <h1 className="text-2xl font-black text-on-surface">Yetkisiz erişim</h1>
        <p className="text-on-surface-variant">
          Bu sayfa yalnızca yöneticilere açıktır. Hesabınızın yetkisi bulunmuyor.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
