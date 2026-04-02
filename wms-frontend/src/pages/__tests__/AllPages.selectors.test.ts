/**
 * UI Selector Verification — UsersPage + RolesPage + EmployeesPage
 * Run: npx tsx src/pages/__tests__/AllPages.selectors.test.ts
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const read = (f: string) => readFileSync(resolve(__dir, '..', f), 'utf8')

const usersPage = read('UsersPage.tsx')
const rolesPage = read('RolesPage.tsx')
const employeesPage = read('EmployeesPage.tsx')

let passed = 0,
  failed = 0
function assert(label: string, ok: boolean) {
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${label}`)
    failed++
  }
}

console.log('\n══ UsersPage ══')
assert('Title: "Tài khoản"', usersPage.includes('Tài khoản'))
assert('Lock/Unlock toggle button', usersPage.includes('btn-toggle-status'))
assert('Delete button', usersPage.includes('btn-delete-user'))
assert('Self-protection: disabled={isSelf(user)}', usersPage.includes('disabled={isSelf(user)}'))
assert('Lock icon', usersPage.includes('Lock'))
assert('Trash2 icon', usersPage.includes('Trash2'))
assert('Confirm Dialog', usersPage.includes('DialogTitle'))
assert('useDeleteUser hook', usersPage.includes('useDeleteUser'))
assert('useToggleUserStatus hook', usersPage.includes('useToggleUserStatus'))

console.log('\n══ RolesPage ══')
assert('Title: "Phân quyền"', rolesPage.includes('Phân quyền'))
assert('Permission matrix button per row', rolesPage.includes('btn-permission-matrix'))
assert('PermissionMatrixDialog component', rolesPage.includes('PermissionMatrixDialog'))
assert('Settings2 icon', rolesPage.includes('Settings2'))
assert('Action column header "Thao tác"', rolesPage.includes('Thao tác'))

console.log('\n══ EmployeesPage ══')
assert('Title: "Nhân sự"', employeesPage.includes('Nhân sự'))
assert('Edit button', employeesPage.includes('btn-edit'))
assert('Delete button', employeesPage.includes('btn-delete'))
assert('Suspend button', employeesPage.includes('btn-suspend'))
assert('Audit button', employeesPage.includes('btn-audit'))

console.log(`\n══ Total: ${passed} PASSED, ${failed} FAILED ══`)
if (failed > 0) {
  console.log('❌ OVERALL: FAIL')
  process.exit(1)
} else {
  console.log('✅ OVERALL: PASS')
  process.exit(0)
}
