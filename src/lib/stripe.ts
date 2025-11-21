import Stripe from 'stripe';
import { getStripeSecretKey } from './env';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('Stripe secret key is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
  });

  return stripeClient;
}
