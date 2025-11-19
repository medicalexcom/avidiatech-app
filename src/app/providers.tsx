import type { ReactNode } from 'react';
import ClientProviders from './ClientProviders';
import { getClerkEnv } from '@/lib/clerk-env';

export default function Providers({ children }: { children: ReactNode }) {
  const { publishableKey, frontendApi, signInUrl, signUpUrl } = getClerkEnv();

  if (!publishableKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY) is not set. Rendering without Clerk—add a real key to enable authentication.'
      );
    }
    return <>{children}</>;
  }

  return (
    <ClientProviders
      publishableKey={publishableKey}
      frontendApi={frontendApi}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
    >
      {children}
    </ClientProviders>
  );
}
