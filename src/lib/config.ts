// Trial and subscription configuration constants

export const TRIAL_PERIOD_DAYS = 14;

export const STRIPE_PRICING = {
  PRO_PLAN: {
    name: 'AvidiaTech Pro Plan',
    description: 'Full access to product data automation features',
    amount: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'month' as const,
  },
} as const;

export const DEFAULT_QUOTAS = {
  TRIAL: {
    ingestion: 1000,
    seo: 500,
    variants: 200,
    match: 1000,
  },
  PRO: {
    ingestion: 10000,
    seo: 5000,
    variants: 2000,
    match: 10000,
  },
} as const;
