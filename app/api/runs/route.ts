import { NextResponse } from 'next/server';
import { getPersona } from '@/src/persona/library';

const WORKER = process.env.WORKER_HTTP_URL ?? 'http://localhost:5174';

export async function POST(request: Request) {
  const body = await request.json();

  const persona = getPersona(body.personaSlug);
  if (!persona) {
    return NextResponse.json({ error: `Unknown persona: ${body.personaSlug}` }, { status: 400 });
  }
  if (!body.targetUrl || !body.goal) {
    return NextResponse.json({ error: 'targetUrl and goal are required' }, { status: 400 });
  }

  // All-or-none rule for credentials. The form mirrors this; we revalidate
  // here so a malformed direct API call gets a clean 400 instead of round-
  // tripping to the worker.
  const hasAnyCred = !!(body.loginUrl || body.username || body.password);
  const hasAllCreds = !!(body.loginUrl && body.username && body.password);
  if (hasAnyCred && !hasAllCreds) {
    return NextResponse.json(
      { error: 'loginUrl, username, and password must all be provided together' },
      { status: 400 },
    );
  }

  const forwarded: Record<string, unknown> = {
    personaSlug: body.personaSlug,
    targetUrl: body.targetUrl,
    goal: body.goal,
    viewport: body.viewport === 'mobile' ? 'mobile' : 'desktop',
  };
  if (hasAllCreds) {
    forwarded.loginUrl = body.loginUrl;
    forwarded.username = body.username;
    forwarded.password = body.password;
  }

  const res = await fetch(`${WORKER}/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(forwarded),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json(
      { error: 'Worker offline. Start it with `pnpm worker`.' },
      { status: 502 },
    );
  }

  const json = (await res.json()) as { run: { id: string } };
  return NextResponse.json({ runId: json.run.id });
}

export async function GET() {
  const res = await fetch(`${WORKER}/runs`).catch(() => null);
  if (!res || !res.ok) return NextResponse.json({ runs: [] });
  const json = (await res.json()) as { runs: Array<{ id: string; personaSlug: string; targetUrl: string; viewport: string; startedAt: number; status: string; authedAs?: string }> };
  const runs = json.runs.map((r) => ({
    id: r.id,
    status: r.status,
    personaSlug: r.personaSlug,
    personaName: getPersona(r.personaSlug)?.name ?? r.personaSlug,
    targetUrl: r.targetUrl,
    viewport: r.viewport,
    startedAt: r.startedAt,
    authedAs: r.authedAs,
  }));
  return NextResponse.json({ runs });
}
