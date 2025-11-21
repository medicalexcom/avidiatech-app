'use client';
import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Application error</h1>
      <p>Something went wrong. Please try again later.</p>
    </div>
  );
}
