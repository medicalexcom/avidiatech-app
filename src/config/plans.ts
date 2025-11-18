export type PlanSlug = 'starter' | 'growth' | 'pro';

export interface PlanInfo {
  slug: PlanSlug;
  name: string;
  price: string;
  description: string;
  ingestionQuota: number | null;
  descriptionQuota: number | null;
  features: string[];
  priceEnv?: string;
}

export const PLAN_CONFIG: Record<PlanSlug, PlanInfo> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    price: '$29/mo',
    description: 'Kick off trials and low-volume workspaces.',
    ingestionQuota: 100,
    descriptionQuota: 100,
    priceEnv: 'STRIPE_STARTER_PRICE_ID',
    features: ['100 ingests per month', '100 descriptions per month', 'Email support'],
  },
  growth: {
    slug: 'growth',
    name: 'Growth',
    price: '$99/mo',
    description: 'Scale throughput with higher monthly limits.',
    ingestionQuota: 1000,
    descriptionQuota: 1000,
    priceEnv: 'STRIPE_GROWTH_PRICE_ID',
    features: [
      '1,000 ingests per month',
      '1,000 descriptions per month',
      'Priority email support',
    ],
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    price: '$299/mo',
    description: 'Highest limits and concierge assistance.',
    ingestionQuota: 5000,
    descriptionQuota: 5000,
    priceEnv: 'STRIPE_PRO_PRICE_ID',
    features: [
      '5,000 ingests per month',
      '5,000 descriptions per month',
      'Slack or concierge support',
    ],
  },
};

export function normalizePlanSlug(value?: string): PlanSlug {
  const key = (value || '').toLowerCase() as PlanSlug;
  if (PLAN_CONFIG[key]) return key;
  return 'starter';
}
