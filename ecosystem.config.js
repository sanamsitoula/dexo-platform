// ==============================================================================
// PM2 process list for the OneDexo production VM.
//
// Mobile (Expo) is intentionally excluded — it's not a server process in
// production, it's built/published separately (EAS) and isn't part of the
// nginx-fronted app set in infra/nginx/dexo.conf.
//
// Usage (see docs/ci_cd.md for the full deploy flow):
//   pm2 start ecosystem.config.js          # first boot
//   pm2 reload ecosystem.config.js         # zero-downtime redeploy
//   pm2 save && pm2 startup                # survive VM reboots
// ==============================================================================
module.exports = {
  apps: [
    {
      name: 'dexo-api',
      cwd: './apps/api',
      script: 'node',
      args: 'dist/main',
      env: { NODE_ENV: 'production', PORT: 4000 },
    },
    {
      name: 'dexo-platform-web',
      cwd: './apps/platform-web',
      script: 'npm',
      args: 'start -- -p 3001',
      env: { NODE_ENV: 'production', PORT: 3001 },
    },
    {
      name: 'dexo-platform-admin',
      cwd: './apps/platform-admin',
      script: 'npm',
      args: 'start -- -p 3002',
      env: { NODE_ENV: 'production', PORT: 3002 },
    },
    {
      name: 'dexo-tenant-website',
      cwd: './apps/tenant-website',
      script: 'npm',
      args: 'start -- -p 4005',
      env: { NODE_ENV: 'production', PORT: 4005 },
    },
    {
      name: 'dexo-tenant-admin',
      cwd: './apps/tenant-admin',
      script: 'npm',
      args: 'start -- -p 4006',
      env: { NODE_ENV: 'production', PORT: 4006 },
    },
    {
      name: 'dexo-tenant-app',
      cwd: './apps/tenant-app',
      script: 'npm',
      args: 'start -- -p 4007',
      env: { NODE_ENV: 'production', PORT: 4007 },
    },
  ],
};
