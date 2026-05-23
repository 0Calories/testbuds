/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stagehand + Playwright are native server-only deps — keep them out of the bundle.
  serverExternalPackages: ['@browserbasehq/stagehand', 'playwright', 'playwright-core'],
};

export default nextConfig;
