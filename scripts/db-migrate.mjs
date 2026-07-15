#!/usr/bin/env node
// One-command migration helper:  npm run db:migrate [-- optional_name]
//
// Wraps `prisma migrate dev` so a name is never required — if you don't pass
// one, it auto-generates schema_change_<timestamp>. Descriptive names are
// still better (they read well in prisma/migrations/), but a forgotten name
// should never be the reason a schema change ships without its migration.
import { spawnSync } from 'node:child_process';

const provided = process.argv.slice(2).join('_').replace(/[^a-zA-Z0-9_]/g, '_');
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const name = provided || `schema_change_${stamp}`;

console.log(`==> prisma migrate dev --name ${name}`);
const res = spawnSync('npx', ['prisma', 'migrate', 'dev', '--name', name], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (res.status === 0) {
  console.log('\n==> Migration created and applied to your local DB.');
  console.log('==> Now commit BOTH prisma/schema.prisma AND the new prisma/migrations folder, then push.');
}
process.exit(res.status ?? 1);
