export type ClerkEnv = {
  publishableKey: string | null;
  frontendApi: string | null;
  signInUrl: string;
  signUpUrl: string;
};

export function getClerkEnv(): ClerkEnv {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || null;
  const frontendApi =
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || process.env.CLERK_FRONTEND_API || null;
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up';

  return {
    publishableKey,
    frontendApi,
    signInUrl,
    signUpUrl,
  };
}
