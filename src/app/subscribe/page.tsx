import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Choose a plan',
  description: 'Select a subscription plan that fits your needs.',
};

export default async function SubscribePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in?redirect_url=/subscribe');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-12 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-300">
            Select a subscription plan that fits your needs. Start with a 14-day free trial.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Starter Plan */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Starter</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-white">$29</span>
                <span className="ml-2 text-slate-300">/month</span>
              </div>
            </div>
            <ul className="mb-8 space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>1,000 SKU ingestions/month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>500 SEO optimizations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Basic analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Email support</span>
              </li>
            </ul>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg bg-white/10 py-3 text-center font-semibold text-white transition hover:bg-white/20"
            >
              Select Plan
            </Link>
          </div>

          {/* Professional Plan */}
          <div className="rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-blue-500/10 to-white/5 p-8 shadow-2xl">
            <div className="mb-2">
              <span className="inline-block rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                MOST POPULAR
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Professional</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-white">$99</span>
                <span className="ml-2 text-slate-300">/month</span>
              </div>
            </div>
            <ul className="mb-8 space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>10,000 SKU ingestions/month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>5,000 SEO optimizations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Advanced analytics & reports</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>API access</span>
              </li>
            </ul>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg bg-blue-500 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-blue-400"
            >
              Select Plan
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Enterprise</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-white">$299</span>
                <span className="ml-2 text-slate-300">/month</span>
              </div>
            </div>
            <ul className="mb-8 space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Unlimited ingestions</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Unlimited SEO optimizations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Custom integrations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>Dedicated account manager</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">✓</span>
                <span>SLA guarantee</span>
              </li>
            </ul>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg bg-white/10 py-3 text-center font-semibold text-white transition hover:bg-white/20"
            >
              Contact Sales
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-300">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
