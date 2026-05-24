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

  const res = await fetch(`${WORKER}/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      personaSlug: body.personaSlug,
      targetUrl: body.targetUrl,
      goal: body.goal,
      viewport: body.viewport === 'mobile' ? 'mobile' : 'desktop',
    }),
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
  const json = (await res.json()) as { runs: Array<{ id: string; personaSlug: string; targetUrl: string; viewport: string; startedAt: number; status: string }> };
  // Match the previous shape — the page-list UI consumes `personaName`.
  const runs = json.runs.map((r) => ({
    id: r.id,
    status: r.status,
    personaSlug: r.personaSlug,
    personaName: getPersona(r.personaSlug)?.name ?? r.personaSlug,
    targetUrl: r.targetUrl,
    viewport: r.viewport,
    startedAt: r.startedAt,
  }));
  return NextResponse.json({ runs });
}
