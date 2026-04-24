/**
 * Static selector verification — ProjectPicker (master-plan-project-lookup)
 * Run: npx tsx src/entities/project/__tests__/ProjectPicker.selectors.test.ts
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const read = (f: string): string => readFileSync(resolve(__dir, '..', f), 'utf8')

const picker = read('ui/project-picker/ProjectPicker.tsx')
const hook = read('api/useProjectLookup.ts')

let passed = 0
let failed = 0

function assert(label: string, ok: boolean): void {
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${label}`)
    failed++
  }
}

console.log('\n══ ProjectPicker ══')

assert('Wraps EntityPicker', picker.includes('EntityPicker'))
assert('Imports from shared/ui/entity-picker', picker.includes("'@/shared/ui/entity-picker'"))
assert('Uses string catalog (S.PLACEHOLDER)', picker.includes('S.PLACEHOLDER'))
assert('Renders Badge for status', picker.includes('Badge') && picker.includes('STATUS_VARIANT'))
assert('Org row uses ORG_PREFIX', picker.includes('S.ORG_PREFIX'))
assert(
  'No dead currentOrgId prop',
  !picker.includes('currentOrgId') && !picker.includes('isCrossOrg'),
)
assert('Calls fetchProjectById for hydration', picker.includes('onFetchById={fetchProjectById}'))

console.log('\n══ useProjectLookup ══')

assert('Endpoint /projects/lookup', hook.includes('/projects/lookup'))
assert('Uses status_whitelist (not include_inactive)', hook.includes('status_whitelist'))
assert(
  'PROJECT_ACTIVE_STATUSES = 5 statuses',
  hook.includes('WON_BID') && hook.includes('WARRANTY'),
)
assert('fetchProjectById exported', hook.includes('export async function fetchProjectById'))
assert('fetchProjectById returns null on error', hook.includes('return null'))
assert('staleTime set', hook.includes('staleTime'))

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
