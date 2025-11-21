import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choose a plan',
  description: 'Select a subscription plan that fits your needs.',
};

export default function SubscribePage() {
  return (
    <div className="min-h-screen py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Subscription Plans</h1>
      <p>Plan selection coming soon.</p>
    </div>
  );
}
