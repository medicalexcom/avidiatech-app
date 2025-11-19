import { getClerkEnv } from '@/lib/clerk-env';
import SignUpClient from './SignUpClient';

export default function SignUpPage() {
  const env = getClerkEnv();
  return <SignUpClient env={env} />;
}
