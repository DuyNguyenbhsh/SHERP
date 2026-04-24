/**
 * Static selector verification — MasterPlanFormDialog (master-plan-project-lookup)
 * Run: npx tsx src/features/master-plan/__tests__/MasterPlanFormDialog.selectors.test.ts
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const read = (f: string): string => readFileSync(resolve(__dir, '..', f), 'utf8')

const dialog = read('ui/MasterPlanFormDialog.tsx')
const helpers = read('ui/MasterPlanFormDialog.helpers.tsx')
const strings = read('constants/project-lookup.strings.ts')

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

console.log('\n══ MasterPlanFormDialog ══')

assert(
  'Imports ProjectPicker',
  helpers.includes("from '@/entities/project'") && helpers.includes('ProjectPicker'),
)
assert('Imports string catalog', dialog.includes('project-lookup.strings'))
assert('Uses <ProjectPicker id="mp-project" />', helpers.includes('id="mp-project"'))
assert('No hardcoded "Project UUID" label', !dialog.includes('Project UUID'))
assert('Uses LABEL_PROJECT_REQUIRED', helpers.includes('LABEL_PROJECT_REQUIRED'))
assert(
  'Budget warning banner present',
  dialog.includes('BudgetWarningBanner') && helpers.includes('BUDGET_WARNING_TITLE'),
)
assert(
  'Uses BigInt for headroom',
  helpers.includes('BigInt(') || read('ui/MasterPlanFormDialog.types.ts').includes('BigInt('),
)
assert(
  'Uses Intl.NumberFormat vi-VN',
  helpers.includes("Intl.NumberFormat('vi-VN')") ||
    read('ui/MasterPlanFormDialog.types.ts').includes("Intl.NumberFormat('vi-VN')"),
)
assert(
  'Include-inactive checkbox wired',
  helpers.includes('includeInactive') && helpers.includes('TOGGLE_INCLUDE_INACTIVE'),
)
assert(
  'useCreateMasterPlan consumer handles warning field',
  dialog.includes('result.warning') && dialog.includes('result.headroom'),
)

console.log('\n══ String catalog ══')

assert('Has LABEL_PROJECT_REQUIRED', strings.includes('LABEL_PROJECT_REQUIRED'))
assert('Has BUDGET_WARNING_TITLE', strings.includes('BUDGET_WARNING_TITLE'))
assert('Has BUDGET_WARNING_BODY function', strings.includes('BUDGET_WARNING_BODY'))
assert(
  'Has all 7 status labels',
  [
    'STATUS_WON_BID',
    'STATUS_ACTIVE',
    'STATUS_ON_HOLD',
    'STATUS_SETTLING',
    'STATUS_WARRANTY',
    'STATUS_CLOSED',
    'STATUS_CANCELLED',
  ].every((k) => strings.includes(k)),
)
assert('ORG_PREFIX present (renamed from CROSS_ORG_PREFIX)', strings.includes('ORG_PREFIX'))
assert('BUDGET_WARNING_CLOSE present', strings.includes('BUDGET_WARNING_CLOSE'))
assert('BUDGET_WARNING_SAVED_NOTICE present', strings.includes('BUDGET_WARNING_SAVED_NOTICE'))

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
