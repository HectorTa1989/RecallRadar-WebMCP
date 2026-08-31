import { RecallRadarApp } from '@/components/recall-radar-app';
import { getAccountEntitlements } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const account = await getAccountEntitlements();
  return (
    <RecallRadarApp
      account={account}
      agent={{
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL ?? 'gemini-3.7-flash',
      }}
    />
  );
}
