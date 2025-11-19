import { getClerkEnv } from '@/lib/clerk-env';
import SignInClient from './SignInClient';

export default function SignInPage() {
  const env = getClerkEnv();
  return <SignInClient env={env} />;
}
