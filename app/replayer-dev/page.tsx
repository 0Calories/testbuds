import { LiveReplayer } from '@/components/LiveReplayer';

export default function ReplayerDev({ searchParams }: { searchParams: Promise<{ runId?: string }> }) {
  return <ReplayerDevInner searchParams={searchParams} />;
}

async function ReplayerDevInner({ searchParams }: { searchParams: Promise<{ runId?: string }> }) {
  const { runId } = await searchParams;
  if (!runId) return <div style={{ padding: 32 }}>Pass <code>?runId=…</code></div>;
  return (
    <div style={{ width: '100vw', height: '100vh', padding: 16, background: '#222' }}>
      <div style={{ width: '100%', height: '100%', border: '2px solid #555' }}>
        <LiveReplayer runId={runId} />
      </div>
    </div>
  );
}
