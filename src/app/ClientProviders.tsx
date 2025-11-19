'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export type ClientProvidersProps = {
  children: ReactNode;
  publishableKey: string;
  frontendApi: string | null;
  signInUrl: string;
  signUpUrl: string;
};

export default function ClientProviders({
  children,
  publishableKey,
  frontendApi,
  signInUrl,
  signUpUrl,
}: ClientProvidersProps) {
  const normalizedFrontendApi = frontendApi?.replace(/^https?:\/\//, '');
  const clerkJSUrl = normalizedFrontendApi
    ? `https://${normalizedFrontendApi}/npm/@clerk/clerk-js@latest/dist/clerk.js`
    : undefined;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      clerkJSUrl={clerkJSUrl}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
