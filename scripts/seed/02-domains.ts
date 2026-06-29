/**
 * Dexo v5 - 02: Domain seeding
 *
 * Seeds Domain, DomainModule, DomainRole, DomainPermission,
 * DomainMenu, DomainWidget, DomainTheme for all 12 domain types.
 *
 * For the v5 rebuild, this delegates to the existing comprehensive
 * domain seeder (seed-domains-complete.js). In a future iteration
 * this can be replaced with a fully TS-based seeder.
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';

export async function seed02Domains() {
  console.log('  → 02-domains');
  const seeder = path.join(process.cwd(), 'scripts', 'seed-domains-complete.js');
  if (!existsSync(seeder)) {
    console.log('    ! seed-domains-complete.js not found, skipping');
    return;
  }
  try {
    execSync(`node "${seeder}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('    ! domain seed failed (continuing):', (e as Error).message);
  }
}
