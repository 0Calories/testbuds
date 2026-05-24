import { NextResponse } from 'next/server';

const WORKER = process.env.WORKER_HTTP_URL ?? 'http://localhost:5174';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${WORKER}/runs/${id}`).catch(() => null);
  if (!res) {
    return NextResponse.json({ error: 'Worker offline' }, { status: 502 });
  }
  if (res.status === 404) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  const json = await res.json();
  return NextResponse.json(json);
}
