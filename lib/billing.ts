import { getChatGPTUser } from '@/app/chatgpt-auth';

export type AccountTier = 'free' | 'pro' | 'admin';

export interface AccountEntitlements {
  userId: string;
  email: string;
  displayName: string;
  tier: AccountTier;
  isAdmin: boolean;
  hasPremium: boolean;
  source: 'local-admin' | 'admin-allowlist' | 'polar' | 'free';
}

const splitEnv = (value?: string) => new Set((value ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));

export async function getAccountEntitlements(): Promise<AccountEntitlements> {
  const user = await getChatGPTUser();
  const isLocal = process.env.NODE_ENV !== 'production';
  const resolved = user ?? (isLocal ? { userId: 'demo-admin', email: 'admin@recallradar.local', displayName: 'Hector Ta', fullName: 'Hector Ta' } : null);

  if (!resolved) {
    return { userId: 'anonymous', email: '', displayName: 'Guest investigator', tier: 'free', isAdmin: false, hasPremium: false, source: 'free' };
  }

  const adminUserIds = splitEnv(process.env.ADMIN_USER_IDS);
  const adminEmails = splitEnv(process.env.ADMIN_EMAILS);
  const isAdmin = resolved.userId === 'demo-admin' || adminUserIds.has(resolved.userId.toLowerCase()) || adminEmails.has(resolved.email.toLowerCase());
  if (isAdmin) {
    return {
      userId: resolved.userId, email: resolved.email, displayName: resolved.displayName,
      tier: 'admin', isAdmin: true, hasPremium: true, source: resolved.userId === 'demo-admin' ? 'local-admin' : 'admin-allowlist',
    };
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (accessToken) {
    const apiBase = process.env.POLAR_SERVER === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh';
    try {
      const response = await fetch(`${apiBase}/v1/customers/external/${encodeURIComponent(resolved.userId)}/state`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        next: { revalidate: 60 },
      });
      if (response.ok) {
        const state = await response.json() as { active_subscriptions?: unknown[]; granted_benefits?: Array<{ benefit_id?: string; benefit_metadata?: Record<string, unknown> }> };
        const featureBenefitId = process.env.POLAR_PRO_BENEFIT_ID;
        const hasBenefit = (state.granted_benefits ?? []).some((benefit) =>
          (featureBenefitId && benefit.benefit_id === featureBenefitId) || benefit.benefit_metadata?.feature === 'recallradar_pro',
        );
        const hasPremium = hasBenefit || (state.active_subscriptions?.length ?? 0) > 0;
        if (hasPremium) {
          return { userId: resolved.userId, email: resolved.email, displayName: resolved.displayName, tier: 'pro', isAdmin: false, hasPremium: true, source: 'polar' };
        }
      }
    } catch {
      // Billing outages fail closed for paid actions; the deterministic read-only trace remains available.
    }
  }

  return { userId: resolved.userId, email: resolved.email, displayName: resolved.displayName, tier: 'free', isAdmin: false, hasPremium: false, source: 'free' };
}
