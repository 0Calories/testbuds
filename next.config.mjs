/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable response compression. SSE responses (/api/runs/[id]/events) were
  // being buffered until the gzip window had enough data to flush, which
  // delayed rrweb events from reaching the client until late in the run.
  compress: false,
  // Stagehand + Playwright are native server-only deps — keep them out of the bundle.
  // rrweb is included here because we resolve a file path inside its dist/ at
  // runtime; without externalizing it, Next.js rewrites `import.meta.url` to a
  // virtual `(rsc)/...` path that doesn't exist on disk.
  serverExternalPackages: [
    '@browserbasehq/stagehand',
    'playwright',
    'playwright-core',
    'rrweb',
  ],
};

export default nextConfig;
