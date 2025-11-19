'use client';

type Props = {
  missingKeys: string[];
  headline?: string;
};

export default function ClerkSetupAlert({ missingKeys, headline }: Props) {
  if (!missingKeys.length) {
    return null;
  }

  return (
    <section className="w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
      <p className="font-semibold text-rose-900">
        {headline || 'Clerk is not configured for this deployment.'}
      </p>
      <p className="mt-2 text-rose-800">
        Add the following environment variables to your Vercel project and redeploy. The sign-in page
        stays hidden until these values are present.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-xs">
        {missingKeys.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
      <p className="mt-4 text-rose-700">
        Make sure the publishable key comes from the same Clerk instance as the frontend API value so
        the widget loads correctly on your preferred domain.
      </p>
    </section>
  );
}
