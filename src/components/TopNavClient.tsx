'use client';

import Providers from '@/app/providers';
import TopNav from './TopNav';

export default function TopNavClient(props: any) {
  return (
    <Providers>
      <TopNav {...props} />
    </Providers>
  );
}
