import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPaymentIntent, CreatePaymentIntentParams } from '../payment';

vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with valid params', async () => {
      const { supabase } = await import('../supabase');
      vi.mocked(supabase!.functions.invoke).mockResolvedValue({
        data: {
          client_secret: 'pi_test_secret_123',
          payment_intent_id: 'pi_test_123',
        },
        error: null,
      });

      const params: CreatePaymentIntentParams = {
        order_id: 'order-123',
        amount: 9999,
        currency: 'EUR',
      };

      const result = await createPaymentIntent(params);
      expect(result.client_secret).toBe('pi_test_secret_123');
      expect(result.payment_intent_id).toBe('pi_test_123');
    });

    it('should throw error if client_secret is missing', async () => {
      const { supabase } = await import('../supabase');
      vi.mocked(supabase!.functions.invoke).mockResolvedValue({
        data: { payment_intent_id: 'pi_123', error: 'Missing client secret' },
        error: null,
      });

      const params: CreatePaymentIntentParams = {
        order_id: 'order-123',
        amount: 5000,
      };

      await expect(createPaymentIntent(params)).rejects.toThrow();
    });
  });
});
