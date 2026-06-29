/**
 * scripts/seed/visual-templates/index.ts
 *
 * STANDALONE seed for BusinessTypeTemplate visual enhancements.
 * ─────────────────────────────────────────────────────────────
 * This is NOT part of the main seed chain (scripts/seed/index.ts).
 * It runs independently and is safe to re-run at any time.
 *
 * PURPOSE
 *   Upgrades existing BusinessTypeTemplate rows (already seeded by
 *   01-domain-templates.ts) with richer visual configuration:
 *     • detailed websiteSections variants & styles
 *     • premium color palettes & typography
 *     • dashboard widget styles
 *     • heroImage / heroVideo asset paths
 *
 *   It NEVER touches tenants, users, lifecycle, or any other model.
 *   It uses upsert — safe on a fresh DB (creates) or existing DB (updates).
 *
 * RUN
 *   npx ts-node scripts/seed/visual-templates/index.ts
 *
 *   Or via npm script (add to root package.json):
 *   "db:seed:visual-templates": "ts-node scripts/seed/visual-templates/index.ts"
 *
 * DEPENDENCY ORDER
 *   Can run after Phase 1 migration.
 *   Does not require 00-platform.ts or 02-domains.ts to have run first.
 *   Safe to run BEFORE or AFTER 01-domain-templates.ts — it will upsert either way.
 *
 * FUTURE EXTENSION
 *   When BusinessTypeAssets model is added (see docs/FUTURE_BUSINESS_TEMPLATE_EXPANSION.md),
 *   add a call to seedVisualAssets() below the existing seedVisualTemplates() call.
 */

import { PrismaClient } from '@prisma/client'
import { seedVisualTemplates } from './seed-visual-templates'

const prisma = new PrismaClient()

async function main() {
  const startTime = Date.now()

  console.log('')
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║   Dexo — Visual Template Seed (standalone)          ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log('')
  console.log('  ⚠️  This seed upgrades BusinessTypeTemplate only.')
  console.log('  ⚠️  It does not touch tenants, users, or other data.')
  console.log('')

  await seedVisualTemplates(prisma)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('')
  console.log(`✅  Visual template seed complete in ${elapsed}s`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('\n❌  Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
