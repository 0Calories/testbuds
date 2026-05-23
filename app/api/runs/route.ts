import { NextResponse } from 'next/server';
import { getPersona } from '@/src/persona/library';
import type { Connection } from '@/src/connection/types';
import { startRun } from '@/src/web/run-executor';
import { listRuns } from '@/src/web/run-store';

export async function POST(request: Request) {
  const body = await request.json();

  const persona = getPersona(body.personaSlug);
  if (!persona) {
    return NextResponse.json(
      { error: `Unknown persona: ${body.personaSlug}` },
      { status: 400 },
    );
  }
  if (!body.targetUrl || !body.goal) {
    return NextResponse.json({ error: 'targetUrl and goal are required' }, { status: 400 });
  }

  const connection: Connection =
    body.loginUrl && body.username && body.password
      ? {
          mode: 'test-credential',
          loginUrl: body.loginUrl,
          username: body.username,
          password: body.password,
        }
      : { mode: 'public' };

  const viewport = body.viewport === 'mobile' ? 'mobile' : 'desktop';

  const runId = startRun({
    persona,
    connection,
    targetUrl: body.targetUrl,
    goal: body.goal,
    viewport,
  });

  return NextResponse.json({ runId });
}

export async function GET() {
  const runs = listRuns().map((r) => ({
    id: r.id,
    status: r.status,
    personaSlug: r.persona.slug,
    personaName: r.persona.name,
    targetUrl: r.targetUrl,
    viewport: r.viewport,
    startedAt: r.startedAt,
  }));
  return NextResponse.json({ runs });
}
