/**
 * UI Selector Verification Script — EmployeesPage
 * Gate 4 TEST: Static check for UI components before marking PASS.
 *
 * Run: npx tsx src/pages/__tests__/EmployeesPage.selectors.test.ts
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const PAGE_PATH = resolve(__dir, '..', 'EmployeesPage.tsx')
const source = readFileSync(PAGE_PATH, 'utf8')

let passed = 0
let failed = 0

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${label}`)
    failed++
  }
}

console.log('\n══ EmployeesPage UI Selector Verification ══\n')

console.log('[Vietnamese Text]')
assert('Title: "Nhân sự"', source.includes('Nhân sự'))
assert('Subtitle: "Quản lý nhân viên"', source.includes('Quản lý nhân viên'))
assert('Tab: "Danh sách"', source.includes('Danh sách'))
assert('Tab: "Sơ đồ tổ chức"', source.includes('Sơ đồ tổ chức'))
assert('Header: "Trạng thái"', source.includes('Trạng thái'))
assert('Header: "Thao tác"', source.includes('Thao tác'))
assert('No raw \\\\u escapes in rendered text', !source.match(/['">]\s*\\u[0-9a-fA-F]{4}/))

console.log('\n[Action Buttons - 4 total]')
assert('Edit button: data-testid="btn-edit"', source.includes('data-testid="btn-edit"'))
assert('Edit: Pencil icon', source.includes('Pencil'))
assert('Edit: title "Sửa thông tin"', source.includes('Sửa thông tin'))
assert('Suspend button: data-testid="btn-suspend"', source.includes('data-testid="btn-suspend"'))
assert('Suspend: PauseCircle icon', source.includes('PauseCircle'))
assert('Suspend: title "Tạm ngưng"', source.includes('Tạm ngưng'))
assert('Delete button: data-testid="btn-delete"', source.includes('data-testid="btn-delete"'))
assert('Delete: Trash2 icon', source.includes('Trash2'))
assert('Delete: title "Xóa nhân viên"', source.includes('Xóa nhân viên'))
assert('Audit button: data-testid="btn-audit"', source.includes('data-testid="btn-audit"'))
assert('Audit: History icon', source.includes('History'))

console.log('\n[Dialog Components]')
assert('CreateEmployeeDialog', source.includes('CreateEmployeeDialog'))
assert('EditEmployeeDialog', source.includes('EditEmployeeDialog'))
assert('AuditLogDialog', source.includes('AuditLogDialog'))
assert('Confirm: "Xác nhận xóa nhân viên"', source.includes('Xác nhận xóa nhân viên'))

console.log('\n[Status Badges]')
assert('Đang làm việc', source.includes('Đang làm việc'))
assert('Tạm ngưng', source.includes('Tạm ngưng'))
assert('Nghỉ việc', source.includes('Nghỉ việc'))

console.log('\n[API Hooks]')
assert('useDeleteEmployee', source.includes('useDeleteEmployee'))
assert('useChangeStatus', source.includes('useChangeStatus'))

console.log(`\n══ Result: ${passed} PASSED, ${failed} FAILED ══`)
if (failed > 0) {
  console.log('❌ Gate 4 TEST: FAIL')
  process.exit(1)
} else {
  console.log('✅ Gate 4 TEST: PASS — All UI selectors verified')
  process.exit(0)
}
