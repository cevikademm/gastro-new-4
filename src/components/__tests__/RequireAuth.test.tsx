/**
 * RequireAuth kapısı — üç durum:
 *   1. Girişli   → içerik render edilir (kullanıcı KİLİTLENMEZ).
 *   2. Oturumsuz ve denetim bitmiş → /login'e gider, hedefi taşır.
 *   3. Denetim sürüyor → henüz yönlendirme YOK (OAuth dönüşü yarışı).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import RequireAuth from '../RequireAuth';
import { useAuthStore } from '../../stores/authStore';

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '';
  return <div>GIRIS_SAYFASI:{from}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/3d-design" element={<RequireAuth><div>KORUMALI_ICERIK</div></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  );
}

const setAuth = (patch: Partial<ReturnType<typeof useAuthStore.getState>>) =>
  useAuthStore.setState(patch as never);

describe('RequireAuth', () => {
  beforeEach(() => {
    setAuth({ user: null, isAuthenticated: false, sessionChecked: false });
  });

  it('girisli kullaniciyi iceri alir', () => {
    setAuth({
      user: { id: 'u1', email: 'a@b.c', role: 'User' } as never,
      isAuthenticated: true,
      sessionChecked: true,
    });
    renderAt('/3d-design');
    expect(screen.getByText('KORUMALI_ICERIK')).toBeTruthy();
  });

  it('oturumsuz ziyaretciyi giris sayfasina yonlendirir ve hedefi tasir', () => {
    setAuth({ user: null, isAuthenticated: false, sessionChecked: true });
    renderAt('/3d-design');
    expect(screen.getByText('GIRIS_SAYFASI:/3d-design')).toBeTruthy();
  });

  it('oturum denetimi bitmeden yonlendirmez', () => {
    setAuth({ user: null, isAuthenticated: false, sessionChecked: false });
    renderAt('/3d-design');
    expect(screen.queryByText(/GIRIS_SAYFASI/)).toBeNull();
    expect(screen.queryByText('KORUMALI_ICERIK')).toBeNull();
  });
});
