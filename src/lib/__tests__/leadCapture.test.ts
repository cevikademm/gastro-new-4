import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasCapturedLead, markLeadCaptured, submitLead, LeadSource } from '../leadCapture';

vi.mock('../analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('../supabase', () => ({
  supabase: { from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ data: {}, error: null }) })) },
}));
vi.mock('../email', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));

describe('leadCapture', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const STORAGE_KEY = '2mc_lead_captured';

  describe('hasCapturedLead', () => {
    it('should return false when no lead captured', () => {
      expect(hasCapturedLead()).toBe(false);
    });

    it('should return true when lead is captured', () => {
      localStorage.setItem(STORAGE_KEY, '1');
      expect(hasCapturedLead()).toBe(true);
    });
  });

  describe('markLeadCaptured', () => {
    it('should set lead captured flag', () => {
      markLeadCaptured();
      expect(hasCapturedLead()).toBe(true);
    });

    it('should store correct value in localStorage', () => {
      markLeadCaptured();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    });
  });

  describe('submitLead', () => {
    it('should track lead capture event', async () => {
      const { trackEvent } = await import('../analytics');
      await submitLead('user@example.com', 'bom_pdf');
      expect(trackEvent).toHaveBeenCalledWith('lead_capture', expect.objectContaining({ source: 'bom_pdf' }));
    });

    it('should mark lead as captured after submission', async () => {
      await submitLead('user@example.com', 'catalog');
      expect(hasCapturedLead()).toBe(true);
    });
  });
});
