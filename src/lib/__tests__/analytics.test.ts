import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initAnalytics, trackPageview, trackEvent } from '../analytics';

describe('analytics', () => {
  beforeEach(() => {
    delete (window as any).gtag;
    delete (window as any).dataLayer;
    delete (window as any).clarity;
    vi.clearAllMocks();
  });

  describe('trackPageview', () => {
    it('should track page view with path', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackPageview('/about');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({ page_path: '/about' }));
    });
  });

  describe('trackEvent', () => {
    it('should track event with name only', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackEvent('button_click');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'button_click', undefined);
    });

    it('should track event with params', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackEvent('purchase', { value: 29.99, currency: 'EUR' });

      expect(gtagSpy).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({ value: 29.99 }));
    });
  });
});
