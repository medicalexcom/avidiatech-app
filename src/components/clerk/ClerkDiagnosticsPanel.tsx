'use client';

import { useEffect, useState } from 'react';

const mask = (value: string) => {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

export default function ClerkDiagnosticsPanel() {
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up';

  const rows = [
    { label: 'Current origin', value: origin || 'Resolving…' },
    {
      label: 'Publishable key',
      value: publishableKey ? mask(publishableKey) : 'Missing',
    },
    {
      label: 'Frontend API',
      value: frontendApi || 'Missing (Clerk will use the publishable key domain)',
    },
    { label: 'Sign-in URL', value: signInUrl },
    { label: 'Sign-up URL', value: signUpUrl },
  ];

  return (
    <section className="w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Clerk deployment diagnostics</h2>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Read-only</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Compare these values with your Clerk dashboard to confirm the deployment is pointed at the
        correct tenant/domain.
      </p>
      <dl className="mt-4 space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="text-right font-mono text-xs text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
