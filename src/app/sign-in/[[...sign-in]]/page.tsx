export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 text-white">
      <div className="relative flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white/5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
        <div className="hidden w-1/2 flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(94,234,212,0.25),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(244,114,182,0.2),transparent_40%)] p-12 md:flex">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">AvidiaTech</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">Welcome back</h1>
            <p className="mt-3 text-lg text-white/80">
              Sign in to manage your tenants, usage, and subscriptions from the AvidiaTech dashboard.
            </p>
          </div>
          <div className="space-y-2 text-sm text-white/70">
            <p>Secure authentication powered by Clerk.</p>
            <p>Multi-tenant aware with role-based access.</p>
          </div>
        </div>
        <div className="flex w-full items-center justify-center bg-white p-6 text-slate-900 md:w-1/2 md:p-10">
          <div className="w-full max-w-md">
            <SignIn
              path="/sign-in"
              routing="path"
              appearance={{
                elements: {
                  card: 'shadow-none',
                  formButtonPrimary:
                    'bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-sm font-medium',
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
