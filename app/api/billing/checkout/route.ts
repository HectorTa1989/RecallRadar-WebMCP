import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  const isLocal = process.env.NODE_ENV !== 'production';
  const resolved = user ?? (isLocal ? { userId: 'demo-buyer', email: 'buyer@recallradar.local', displayName: 'Demo buyer' } : null);
  if (!resolved) return NextResponse.json({ error: 'Sign in before starting checkout.' }, { status: 401 });

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const productId = process.env.POLAR_PRODUCT_ID;
  if (!accessToken || !productId) {
    return NextResponse.json({ error: 'Polar is not configured yet. Add POLAR_ACCESS_TOKEN and POLAR_PRODUCT_ID.' }, { status: 503 });
  }

  const apiBase = process.env.POLAR_SERVER === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh';
  const appOrigin = process.env.PUBLIC_APP_URL ?? request.nextUrl.origin;
  const checkout = await fetch(`${apiBase}/v1/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      products: [productId],
      external_customer_id: resolved.userId,
      customer_email: resolved.email,
      customer_name: resolved.displayName,
      success_url: `${appOrigin}/?billing=success&checkout_id={CHECKOUT_ID}`,
      return_url: `${appOrigin}/`,
      metadata: { app: 'RecallRadar', github_owner: 'HectorTa1989' },
    }),
  });

  if (!checkout.ok) {
    const detail = await checkout.text();
    return NextResponse.json({ error: 'Polar checkout could not be created.', detail: detail.slice(0, 300) }, { status: 502 });
  }
  const body = await checkout.json() as { url: string };
  return NextResponse.json({ url: body.url });
}
