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
const helper = read('api/fetchProjectById.ts')

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
assert(
  'No swallowed catch in onSearch',
  !picker.includes('} catch {') && !picker.includes('} catch (_)'),
)
assert('Passes errorText to EntityPicker', picker.includes('errorText='))

console.log('\n══ fetchProjectById helper ══')

assert('fetchProjectById exported', helper.includes('export async function fetchProjectById'))
assert('Calls GET /projects/:id endpoint', helper.includes('`/projects/${id}`'))
assert('Returns null on error (404/403)', helper.includes('return null'))
assert(
  'No useQuery / TanStack import (hook removed)',
  !helper.includes('@tanstack/react-query') && !helper.includes('useQuery'),
)

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
