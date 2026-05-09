# Gate 4B — Frontend Implementation Prompt
**FEATURE:** `master-plan-project-lookup` · **Gate:** 4B (Dev — Frontend) · **Branch:** `feature/master-plan-project-lookup`

> **Tech Advisor directive:** Gate 4A backend đã được approve (3 commits landed, 526/526 tests PASS, 0 lint errors). Contract cross-stack đã cố định. Prompt này bind FE vào contract 4A — **không được đổi endpoint, query params, response shape**. Nếu phát hiện mismatch → DỪNG và báo cáo.

---

## 0. Gate 4A delivery state (đã approve)

Commits đã landed trên branch `feature/master-plan-project-lookup`:
- `7eb8c30` feat(projects,master-plan): implement /projects/lookup endpoint + cross-org audit
- `dbb7db3` feat(auth): add VIEW_ALL_PROJECTS privilege (+ migration 1776300000013)
- `0fbb936` feat(common): add centralized Vietnamese error message constants

**Cross-stack contract phải bind chính xác** (Δ so với SA_DESIGN đã được Tech Advisor duyệt):

| Spec | Value | Ghi chú |
|------|-------|--------|
| Endpoint | `GET /projects/lookup` | Đặt trên tuyến `:id` (đã làm 4A) |
| Auth | Bearer JWT + privilege `VIEW_PROJECTS` OR `VIEW_ALL_PROJECTS` | Guard OR logic `.some()` đã verify |
| Query `q` | `string` max 100 ký tự, regex `[\p{L}\p{N}\s\-._]` | Vietnamese-safe (unaccent server-side) |
| Query `limit` | `number` 1–50, default 20 | |
| Query `offset` | `number` >=0, default 0 | |
| Query `status_whitelist` | `ProjectStatus[]` (CSV hoặc array) | **Không còn `include_inactive` boolean** |
| Response envelope | `{ status: true, message: 'Thành công', data: {...} }` | |
| Response `data` | `{ items: LookupProjectItem[], total, limit, offset }` | **Flat**, không có `meta` nested |
| Item shape | `{ id, project_code, project_name, status, stage, organization_id, organization_name }` | `organization_*` nullable; `stage` là stage lifecycle |

**POST /master-plan response mở rộng** (cross-org + budget warning):
- Normal: `{ status, message, data: MasterPlan }`
- Budget warning: `{ status, message, data: MasterPlan, warning: true, headroom: string /* VND bigint */ }`
- `headroom` là **string** để an toàn bigint (VND có thể vượt `Number.MAX_SAFE_INTEGER`). FE phải dùng `BigInt()` + `Intl.NumberFormat('vi-VN')`, **KHÔNG** `parseFloat`/`Number`.

---

## 1. Scope & Guardrails (READ FIRST — ĐỌC RULES TRƯỚC KHI CODE)

**Rules phải đọc lại trước khi bắt đầu:**
1. `D:\SHERP\SHERP\wms-frontend\CLAUDE.md` — FSD architecture, file size ≤ 200 dòng, no hardcoded VN strings trong JSX
2. `D:\SHERP\SHERP\.claude\rules\dev-rules.md` — Dev conventions chung
3. `D:\SHERP\SHERP\docs\features\master-plan-project-lookup\UI_SPEC.md` — UI behavior spec (§4 payload, §5 EntityPicker API, §6 ProjectPicker wrapper, §7 hook, §8 string catalog)
4. `D:\SHERP\SHERP\docs\features\master-plan-project-lookup\SA_DESIGN.md` — Cross-stack contract

**Blast radius:** 12 file — 9 new, 3 modified. **CHỈ đụng `wms-frontend/`**, KHÔNG đụng backend.

**Branch policy:** Tiếp tục trên `feature/master-plan-project-lookup`. **KHÔNG push remote** ở bất kỳ step nào — Gate 4B chỉ commit local; push remote sẽ do Gate 5 QA approve mới thực hiện.

**File size limit:** Mỗi file ≤ 200 dòng (rule CLAUDE.md). Nếu quá → split.

**String catalog rule:** Mọi VN string trong JSX PHẢI import từ `project-lookup.strings.ts` — không hardcode.

**Design token rule:** Không hardcode hex. Chỉ dùng Tailwind utility classes map từ CSS variables (`bg-warning`, `text-success`, etc. sau khi token đã thêm ở Step 1).

---

## 2. Pre-flight Checks (trước Step 1)

Chạy trong `wms-frontend/`:

```bash
git status                           # Working tree phải sạch (chỉ untracked prompt file OK)
git log --oneline -5                 # Xác nhận HEAD là 7eb8c30 (Gate 4A commit cuối)
npm run type-check                   # PASS
npm run lint                         # PASS (warnings hiện tại OK, chỉ cần 0 errors)
```

Nếu bất kỳ bước nào FAIL → DỪNG, báo cáo trước khi bắt đầu Step 1.

---

## 3. Implementation — 7 Steps

Mỗi step = 1 commit. Verify `npm run type-check` + `npm run lint` PASS trước mỗi commit. Commit message theo Conventional Commits.

---

### ✅ Step 1 — Install cmdk + shadcn components + add design tokens

**Commit:** `feat(ui): add cmdk + command/popover/alert/skeleton + warning/success tokens`

**1.1 Install cmdk:**
```bash
cd wms-frontend
npm install cmdk
```

**1.2 Add 4 shadcn components** (dùng `--yes --overwrite` để tránh interactive prompt; nếu CLI vẫn treo thì dừng và báo):
```bash
npx shadcn@latest add command popover alert skeleton --yes --overwrite
```

Expected: 4 file mới tại `src/components/ui/`:
- `command.tsx`
- `popover.tsx`
- `alert.tsx`
- `skeleton.tsx`

Style `radix-nova` (per `components.json`) sẽ được shadcn CLI apply tự động — **không chỉnh sửa thủ công**.

**1.3 Add `--warning` + `--success` tokens vào `src/index.css`:**

Mở `src/index.css`. Tại block `:root` (sau `--destructive`, trước `--border`), thêm:
```css
  --warning: oklch(0.72 0.15 75);
  --warning-foreground: oklch(0.22 0.02 75);
  --success: oklch(0.60 0.14 150);
  --success-foreground: oklch(0.98 0.005 150);
```

Tại block `.dark` (sau `--destructive`, trước `--border`), thêm:
```css
  --warning: oklch(0.75 0.14 75);
  --warning-foreground: oklch(0.18 0.02 75);
  --success: oklch(0.65 0.13 150);
  --success-foreground: oklch(0.18 0.02 150);
```

Tại block `@theme inline` (sau dòng `--color-destructive: var(--destructive);`), thêm:
```css
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
```

**1.4 Verify:**
```bash
npm run type-check    # PASS
npm run lint          # PASS (0 errors)
npm run build         # PASS (Vite build phải compile CSS được)
```

**1.5 Commit:**
```bash
git add src/index.css src/components/ui/command.tsx src/components/ui/popover.tsx src/components/ui/alert.tsx src/components/ui/skeleton.tsx package.json package-lock.json
git commit -m "feat(ui): add cmdk + command/popover/alert/skeleton + warning/success tokens

- Install cmdk for command palette primitives
- Add shadcn components: command, popover, alert, skeleton (radix-nova style)
- Add oklch design tokens: --warning, --success (+ foreground pairs) in :root + .dark
- Register tokens in @theme inline block for Tailwind utility generation

Part of FEATURE master-plan-project-lookup Gate 4B (UI foundation)"
```

---

### ✅ Step 2 — Create `shared/ui/entity-picker/` (generic)

**Commit:** `feat(shared): add generic EntityPicker for LOV patterns`

Tạo folder `src/shared/ui/entity-picker/` với 4 file:

**2.1 `src/shared/ui/entity-picker/types.ts`** (~30 dòng):
```typescript
import type { ReactNode } from 'react'

export interface EntityItemBase {
  id: string
  [key: string]: unknown
}

export interface EntityPickerProps<T extends EntityItemBase> {
  /** Current selected ID (controlled). */
  value: string | null
  /** Called when user selects an item or clears. */
  onChange: (id: string | null, item: T | null) => void
  /** Async function to fetch items by search query. */
  onSearch: (query: string) => Promise<T[]>
  /** Pre-fetch item by ID for edit mode hydration. */
  onFetchById?: (id: string) => Promise<T | null>
  /** Render each item in dropdown. */
  renderItem: (item: T, isActive: boolean) => ReactNode
  /** Render the button trigger content when item selected. */
  renderSelected: (item: T) => ReactNode
  /** Placeholder when nothing selected. */
  placeholder?: string
  /** Empty-state text when no results. */
  emptyText?: string
  /** Minimum query length to trigger search. Default 0 (fetch on focus). */
  minQueryLength?: number
  /** Debounce delay in ms. Default 300. */
  debounceMs?: number
  /** Disabled state. */
  disabled?: boolean
  /** ID for label association. */
  id?: string
  /** ARIA label for the trigger button. */
  'aria-label'?: string
}
```

**2.2 `src/shared/ui/entity-picker/useDebouncedValue.ts`** (~20 dòng):
```typescript
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
```

**2.3 `src/shared/ui/entity-picker/EntityPicker.tsx`** (~160 dòng):

Yêu cầu component:
- `Popover` từ `@/components/ui/popover` wrap `Command` từ `@/components/ui/command`
- Trigger là `Button variant="outline"` hiển thị `renderSelected(item)` hoặc `placeholder`
- Trong popover: `CommandInput` với onChange → debounce → call `onSearch`
- `CommandList` + `CommandEmpty` + `CommandGroup` + `CommandItem` dùng `renderItem`
- Loading state: render 3 `Skeleton` rows khi đang fetch
- Edit mode hydration: nếu `value` có nhưng chưa có selectedItem → call `onFetchById(value)` một lần
- Clear button (X icon) inline trong trigger khi có value
- Keyboard: `cmdk` mặc định xử lý Arrow/Enter/Escape
- Không hardcode VN string — `placeholder`, `emptyText` nhận qua prop

Skeleton pseudo:
```typescript
import { useEffect, useRef, useState } from 'react'
import { X, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from './useDebouncedValue'
import type { EntityPickerProps, EntityItemBase } from './types'

export function EntityPicker<T extends EntityItemBase>({
  value, onChange, onSearch, onFetchById,
  renderItem, renderSelected,
  placeholder, emptyText,
  minQueryLength = 0, debounceMs = 300,
  disabled = false, id, 'aria-label': ariaLabel,
}: EntityPickerProps<T>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const hydratedIdRef = useRef<string | null>(null)

  const debouncedQuery = useDebouncedValue(query, debounceMs)

  // Fetch items when query changes (or on open if minQueryLength=0)
  useEffect(() => {
    if (!open) return
    if (debouncedQuery.length < minQueryLength) {
      setItems([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    onSearch(debouncedQuery)
      .then((res) => { if (!cancelled) setItems(res) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery, open, minQueryLength, onSearch])

  // Hydrate selectedItem in edit mode
  useEffect(() => {
    if (!value) { setSelectedItem(null); hydratedIdRef.current = null; return }
    if (hydratedIdRef.current === value) return
    if (selectedItem?.id === value) { hydratedIdRef.current = value; return }
    if (!onFetchById) return
    let cancelled = false
    onFetchById(value).then((item) => {
      if (cancelled) return
      setSelectedItem(item)
      hydratedIdRef.current = value
    }).catch(() => {})
    return () => { cancelled = true }
  }, [value, selectedItem, onFetchById])

  const handleSelect = (item: T): void => {
    setSelectedItem(item)
    onChange(item.id, item)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedItem(null)
    onChange(null, null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate text-left flex-1', !selectedItem && 'text-muted-foreground')}>
            {selectedItem ? renderSelected(selectedItem) : placeholder}
          </span>
          <span className="flex items-center gap-1 ml-2">
            {selectedItem && !disabled && (
              <span role="button" tabIndex={0} onClick={handleClear} className="rounded hover:bg-muted p-0.5">
                <X className="h-4 w-4 opacity-60" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
          <CommandList>
            {isLoading && (
              <div className="p-2 space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            )}
            {!isLoading && items.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            {!isLoading && items.length > 0 && (
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item)}>
                    {renderItem(item, selectedItem?.id === item.id)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**2.4 `src/shared/ui/entity-picker/index.ts`**:
```typescript
export { EntityPicker } from './EntityPicker'
export type { EntityPickerProps, EntityItemBase } from './types'
```

**2.5 Update `src/shared/ui/index.ts`** — thêm dòng:
```typescript
export { EntityPicker, type EntityPickerProps, type EntityItemBase } from './entity-picker'
```

**2.6 Verify + Commit:**
```bash
npm run type-check && npm run lint
git add src/shared/ui/
git commit -m "feat(shared): add generic EntityPicker for LOV patterns

- EntityPicker<T>: Popover + cmdk Command pattern, debounced search, edit-mode hydration via onFetchById
- useDebouncedValue hook (300ms default)
- Typed props: renderItem/renderSelected slot-style, clear button inline
- No VN strings — all copy via props (placeholder, emptyText)
- WCAG: role=combobox, aria-expanded, aria-label pass-through

Part of FEATURE master-plan-project-lookup Gate 4B (shared layer)"
```

---

### ✅ Step 3 — Create `project-lookup.strings.ts` catalog

**Commit:** `feat(master-plan): add Vietnamese string catalog for project lookup`

Tạo file `src/features/master-plan/constants/project-lookup.strings.ts` (~40 dòng).

Copy **CHÍNH XÁC** catalog từ `UI_SPEC.md §8` (nếu §8 không có thì dùng bên dưới — em đã chốt wording):

```typescript
/**
 * String catalog for master-plan project lookup feature.
 * All Vietnamese UI copy lives here — NO hardcoded strings in JSX.
 */
export const PROJECT_LOOKUP_STRINGS = {
  // Field labels
  LABEL_PROJECT: 'Dự án',
  LABEL_PROJECT_REQUIRED: 'Dự án *',

  // Picker UI
  PLACEHOLDER: 'Chọn dự án...',
  PLACEHOLDER_SEARCH: 'Tìm theo mã hoặc tên...',
  EMPTY_NO_RESULTS: 'Không tìm thấy dự án phù hợp',
  EMPTY_TYPE_TO_SEARCH: 'Nhập để tìm kiếm dự án',
  LOADING: 'Đang tải...',

  // Status badges (project stage display)
  STATUS_WON_BID: 'Đã trúng thầu',
  STATUS_ACTIVE: 'Đang thi công',
  STATUS_ON_HOLD: 'Tạm dừng',
  STATUS_SETTLING: 'Đang quyết toán',
  STATUS_WARRANTY: 'Bảo hành',
  STATUS_CLOSED: 'Đã đóng',
  STATUS_CANCELLED: 'Đã huỷ',

  // Toggle
  TOGGLE_INCLUDE_INACTIVE: 'Hiển thị dự án đã đóng/huỷ',

  // Cross-org banner
  CROSS_ORG_PREFIX: 'Dự án thuộc đơn vị:',

  // Budget warning banner
  BUDGET_WARNING_TITLE: 'Ngân sách vượt mức',
  BUDGET_WARNING_BODY: (headroomVnd: string) =>
    `Ngân sách Master Plan đang sát/vượt ngưỡng an toàn. Hạn mức còn lại: ${headroomVnd} VND.`,
  BUDGET_WARNING_ACK: 'Đã hiểu, tiếp tục',

  // Errors (map từ backend error codes)
  ERROR_VALIDATION: 'Từ khoá không hợp lệ',
  ERROR_NETWORK: 'Không kết nối được máy chủ',
  ERROR_UNAUTHORIZED: 'Bạn không có quyền tra cứu dự án',
  ERROR_GENERIC: 'Có lỗi xảy ra khi tra cứu dự án',
} as const

export type ProjectLookupStringKey = keyof typeof PROJECT_LOOKUP_STRINGS
```

**Verify + Commit:**
```bash
npm run type-check && npm run lint
git add src/features/master-plan/constants/project-lookup.strings.ts
git commit -m "feat(master-plan): add Vietnamese string catalog for project lookup

- Centralize all VN UI copy for master-plan-project-lookup feature
- Keys: labels, placeholders, empty states, status badges, cross-org banner, budget warning, error messages
- Typed as const for autocomplete + strict key checking

Part of FEATURE master-plan-project-lookup Gate 4B"
```

---

### ✅ Step 4 — Create `entities/project/api/useProjectLookup.ts` + `fetchProjectById.ts`

**Commit:** `feat(project): add useProjectLookup hook + fetchProjectById helper`

**4.1 Add types vào `src/entities/project/types.ts`:**

Tìm phần cuối file `types.ts`, thêm trước cuối:
```typescript
// ── Project Lookup (master-plan-project-lookup feature) ──
export interface LookupProjectItem {
  id: string
  project_code: string
  project_name: string
  status: ProjectStatus
  stage: ProjectStage
  organization_id: string | null
  organization_name: string | null
}

export interface LookupProjectsResponse {
  items: LookupProjectItem[]
  total: number
  limit: number
  offset: number
}

export interface LookupProjectsQuery {
  q?: string
  limit?: number
  offset?: number
  status_whitelist?: ProjectStatus[]
}
```

**4.2 Create `src/entities/project/api/useProjectLookup.ts`** (~70 dòng):
```typescript
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { LookupProjectItem, LookupProjectsResponse, LookupProjectsQuery } from '../types'

interface ApiEnvelope<T> {
  status: boolean | string
  message: string
  data: T
}

const PROJECT_ACTIVE_STATUSES = [
  'WON_BID',
  'ACTIVE',
  'ON_HOLD',
  'SETTLING',
  'WARRANTY',
] as const

/**
 * Search projects for LOV picker.
 * @param query.q - search term (max 100 chars)
 * @param query.limit - page size (1-50, default 20)
 * @param query.offset - pagination offset (default 0)
 * @param includeInactive - when true, omit status_whitelist (show all statuses)
 */
export function useProjectLookup(
  query: LookupProjectsQuery & { includeInactive?: boolean },
  options?: { enabled?: boolean },
): UseQueryResult<LookupProjectsResponse, Error> {
  const { includeInactive, ...rest } = query
  const params = new URLSearchParams()
  if (rest.q) params.set('q', rest.q)
  if (rest.limit != null) params.set('limit', String(rest.limit))
  if (rest.offset != null) params.set('offset', String(rest.offset))
  if (!includeInactive) {
    params.set('status_whitelist', PROJECT_ACTIVE_STATUSES.join(','))
  }
  const qs = params.toString()
  return useQuery({
    queryKey: ['project-lookup', rest.q ?? '', rest.limit ?? 20, rest.offset ?? 0, Boolean(includeInactive)],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<LookupProjectsResponse>>(
        `/projects/lookup${qs ? `?${qs}` : ''}`,
      )
      return data.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

/**
 * One-off fetch: get a project's lookup shape by ID.
 * Used for edit-mode hydration in picker components.
 * Returns null if not found or user lacks permission (404/403 → null).
 */
export async function fetchProjectById(id: string): Promise<LookupProjectItem | null> {
  try {
    // Backend endpoint: GET /projects/:id returns full Project; we map to LookupProjectItem shape
    const { data } = await api.get<ApiEnvelope<{
      id: string
      project_code: string
      project_name: string
      status: string
      stage: string
      organization_id?: string | null
      organization?: { id: string; name: string } | null
    }>>(`/projects/${id}`)
    const p = data.data
    return {
      id: p.id,
      project_code: p.project_code,
      project_name: p.project_name,
      status: p.status as LookupProjectItem['status'],
      stage: p.stage as LookupProjectItem['stage'],
      organization_id: p.organization?.id ?? p.organization_id ?? null,
      organization_name: p.organization?.name ?? null,
    }
  } catch {
    return null
  }
}
```

**⚠ IMPORTANT:** Implementation của `fetchProjectById` giả định `GET /projects/:id` đã tồn tại và trả về shape kèm `organization`. Trước khi implement, **verify** bằng:
```bash
grep -r "Get(':id')" wms-backend/src/projects/projects.controller.ts
```

Nếu shape khác, **DỪNG và báo cáo** — Tech Advisor sẽ quyết định adjust mapping hay thêm endpoint mới.

**4.3 Update `src/entities/project/index.ts`** — thêm:
```typescript
export { useProjectLookup, fetchProjectById } from './api/useProjectLookup'
export type { LookupProjectItem, LookupProjectsResponse, LookupProjectsQuery } from './types'
```

**4.4 Verify + Commit:**
```bash
npm run type-check && npm run lint
git add src/entities/project/
git commit -m "feat(project): add useProjectLookup hook + fetchProjectById helper

- useProjectLookup: TanStack query for GET /projects/lookup with status_whitelist filter
- Default active statuses: WON_BID, ACTIVE, ON_HOLD, SETTLING, WARRANTY
- fetchProjectById: one-off fetch for edit-mode hydration, maps Project → LookupProjectItem shape
- Types: LookupProjectItem, LookupProjectsResponse, LookupProjectsQuery
- 30s staleTime for cache efficiency

Part of FEATURE master-plan-project-lookup Gate 4B (data layer)"
```

---

### ✅ Step 5 — Create `entities/project/ui/project-picker/ProjectPicker.tsx`

**Commit:** `feat(project): add ProjectPicker wrapper over EntityPicker`

**5.1 Create folder `src/entities/project/ui/project-picker/`:**

**5.2 `src/entities/project/ui/project-picker/ProjectPicker.tsx`** (~120 dòng):
```typescript
import { useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { EntityPicker } from '@/shared/ui/entity-picker'
import { useProjectLookup, fetchProjectById } from '../../api/useProjectLookup'
import type { LookupProjectItem } from '../../types'
import { PROJECT_LOOKUP_STRINGS as S } from '@/features/master-plan/constants/project-lookup.strings'

interface ProjectPickerProps {
  value: string | null
  onChange: (id: string | null, project: LookupProjectItem | null) => void
  /** Show closed/cancelled projects. Default false. */
  includeInactive?: boolean
  /** Show cross-org banner when selected project.organization_id != current user context. */
  currentOrgId?: string | null
  disabled?: boolean
  id?: string
  placeholder?: string
}

const STATUS_LABEL: Record<LookupProjectItem['status'], string> = {
  WON_BID: S.STATUS_WON_BID,
  ACTIVE: S.STATUS_ACTIVE,
  ON_HOLD: S.STATUS_ON_HOLD,
  SETTLING: S.STATUS_SETTLING,
  WARRANTY: S.STATUS_WARRANTY,
  CLOSED: S.STATUS_CLOSED,
  CANCELLED: S.STATUS_CANCELLED,
}

const STATUS_VARIANT: Record<LookupProjectItem['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  WON_BID: 'secondary',
  ACTIVE: 'default',
  ON_HOLD: 'outline',
  SETTLING: 'outline',
  WARRANTY: 'secondary',
  CLOSED: 'outline',
  CANCELLED: 'destructive',
}

export function ProjectPicker({
  value, onChange, includeInactive = false, currentOrgId,
  disabled = false, id, placeholder,
}: ProjectPickerProps): React.JSX.Element {
  // We use the hook only to consume its fetcher — but EntityPicker needs a direct async function.
  // So we build an onSearch that calls the endpoint imperatively via the same query params.
  const onSearch = useCallback(
    async (q: string): Promise<LookupProjectItem[]> => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      params.set('limit', '20')
      if (!includeInactive) {
        params.set('status_whitelist', 'WON_BID,ACTIVE,ON_HOLD,SETTLING,WARRANTY')
      }
      const { api } = await import('@/shared/api/axios')
      try {
        const { data } = await api.get<{ data: { items: LookupProjectItem[] } }>(
          `/projects/lookup?${params.toString()}`,
        )
        return data.data.items
      } catch {
        return []
      }
    },
    [includeInactive],
  )

  const renderItem = useCallback(
    (item: LookupProjectItem, isActive: boolean): React.JSX.Element => {
      const isCrossOrg = currentOrgId != null && item.organization_id != null && item.organization_id !== currentOrgId
      return (
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">{item.project_code}</span>
              <span className="text-sm truncate">— {item.project_name}</span>
            </div>
            {isCrossOrg && item.organization_name && (
              <span className="text-xs text-muted-foreground">
                {S.CROSS_ORG_PREFIX} {item.organization_name}
              </span>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[item.status]} className="shrink-0">
            {STATUS_LABEL[item.status]}
          </Badge>
        </div>
      )
    },
    [currentOrgId],
  )

  const renderSelected = useCallback(
    (item: LookupProjectItem): React.JSX.Element => (
      <span className="inline-flex items-center gap-2 truncate">
        <span className="font-mono font-medium">{item.project_code}</span>
        <span className="truncate">— {item.project_name}</span>
      </span>
    ),
    [],
  )

  return (
    <EntityPicker<LookupProjectItem>
      value={value}
      onChange={onChange}
      onSearch={onSearch}
      onFetchById={fetchProjectById}
      renderItem={renderItem}
      renderSelected={renderSelected}
      placeholder={placeholder ?? S.PLACEHOLDER}
      emptyText={S.EMPTY_NO_RESULTS}
      disabled={disabled}
      id={id}
      aria-label={S.LABEL_PROJECT}
    />
  )
}
```

**5.3 Create `src/entities/project/ui/project-picker/index.ts`**:
```typescript
export { ProjectPicker } from './ProjectPicker'
```

**5.4 Update `src/entities/project/index.ts`** — thêm dòng sau exports hiện có:
```typescript
// UI components
export { ProjectPicker } from './ui/project-picker'
```

**5.5 Verify + Commit:**
```bash
npm run type-check && npm run lint
git add src/entities/project/
git commit -m "feat(project): add ProjectPicker wrapper over EntityPicker

- ProjectPicker: pre-configured for /projects/lookup endpoint
- Displays: code (mono) — name + status badge + cross-org hint when applicable
- Status label/variant maps aligned with PROJECT_LOOKUP_STRINGS catalog
- Edit-mode hydration via fetchProjectById
- All VN copy from string catalog — no hardcoded text

Part of FEATURE master-plan-project-lookup Gate 4B (entity UI)"
```

---

### ✅ Step 6 — Modify `MasterPlanFormDialog.tsx` + update `useCreateMasterPlan`

**Commit:** `feat(master-plan): replace UUID input with ProjectPicker + budget warning banner`

**6.1 Update `src/entities/master-plan/api/useMasterPlan.ts`** — modify `useCreateMasterPlan` to preserve envelope-level `warning`/`headroom`:

Find:
```typescript
export function useCreateMasterPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMasterPlanPayload) => {
      const { data } = await api.post<ApiResponse<MasterPlan>>('/master-plan', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan'] }),
  })
}
```

Replace with:
```typescript
export interface CreateMasterPlanResult {
  plan: MasterPlan
  warning?: boolean
  headroom?: string
}

export function useCreateMasterPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMasterPlanPayload): Promise<CreateMasterPlanResult> => {
      const { data } = await api.post<
        ApiResponse<MasterPlan> & { warning?: boolean; headroom?: string }
      >('/master-plan', payload)
      return {
        plan: data.data,
        warning: data.warning,
        headroom: data.headroom,
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan'] }),
  })
}
```

**6.2 Modify `src/features/master-plan/ui/MasterPlanFormDialog.tsx`:**

Preserve props contract `{ open, onOpenChange, target? }`. Changes:
- Remove "Project UUID *" Input field (lines 130–138 in current file)
- Replace with `<ProjectPicker>` wired to `form.project_id`
- Add budget warning banner state + UI (shown after successful `createMut` if `warning === true`)
- Add optional "include inactive" checkbox for picker
- Replace hardcoded `toast.error('Nhập đủ mã, tên, dự án')` with import from strings catalog (add `ERROR_MISSING_FIELDS` key if needed) — **OR** keep as-is if Tech Advisor defers — flag as minor debt
- Use `BigInt()` + `Intl.NumberFormat('vi-VN')` to format `headroom` for banner

Full new file:
```typescript
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'  // NOTE: if not present, add via shadcn OR use native input
import { ProjectPicker } from '@/entities/project'
import { useCreateMasterPlan, useUpdateMasterPlan, type MasterPlan } from '@/entities/master-plan'
import { getErrorMessage } from '@/shared/api/axios'
import { PROJECT_LOOKUP_STRINGS as S } from '@/features/master-plan/constants/project-lookup.strings'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  target?: MasterPlan | null
}

function formatVndBigint(value: string): string {
  try {
    return new Intl.NumberFormat('vi-VN').format(BigInt(value))
  } catch {
    return value
  }
}

export function MasterPlanFormDialog({ open, onOpenChange, target }: Props): React.JSX.Element {
  const createMut = useCreateMasterPlan()
  const updateMut = useUpdateMasterPlan()
  const isEdit = Boolean(target)

  const [form, setForm] = useState({
    code: '', name: '', year: new Date().getFullYear(),
    project_id: '', budget_vnd: '', start_date: '', end_date: '',
  })
  const [includeInactive, setIncludeInactive] = useState(false)
  const [budgetWarning, setBudgetWarning] = useState<{ headroom: string } | null>(null)

  useEffect(() => {
    setBudgetWarning(null)
    if (target) {
      setForm({
        code: target.code, name: target.name, year: target.year,
        project_id: target.project_id,
        budget_vnd: target.budget_vnd ?? '',
        start_date: target.start_date ?? '',
        end_date: target.end_date ?? '',
      })
    } else {
      setForm({
        code: '', name: '', year: new Date().getFullYear(),
        project_id: '', budget_vnd: '', start_date: '', end_date: '',
      })
    }
  }, [target, open])

  const handleSubmit = (): void => {
    if (!form.code || !form.name || !form.project_id) {
      toast.error('Nhập đủ mã, tên, dự án')
      return
    }
    const payload = {
      code: form.code, name: form.name, year: Number(form.year),
      project_id: form.project_id,
      budget_vnd: form.budget_vnd || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    }
    if (isEdit && target) {
      updateMut.mutate({ id: target.id, data: payload }, {
        onSuccess: () => {
          toast.success('Đã cập nhật Master Plan')
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: (result) => {
          if (result.warning && result.headroom) {
            setBudgetWarning({ headroom: result.headroom })
            // do NOT close dialog — user must ack the warning
            return
          }
          toast.success('Đã tạo Master Plan')
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
      })
    }
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa Master Plan' : 'Tạo Master Plan'}</DialogTitle>
          <DialogDescription>
            Khai báo kế hoạch bảo trì / vận hành cho 1 dự án + năm
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-code">Mã *</Label>
            <Input id="mp-code" className="col-span-2"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="MP-2026-TOWER-A" />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-name">Tên *</Label>
            <Input id="mp-name" className="col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-year">Năm *</Label>
            <Input id="mp-year" type="number" className="col-span-2"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-project">{S.LABEL_PROJECT_REQUIRED}</Label>
            <div className="col-span-2 space-y-2">
              <ProjectPicker
                id="mp-project"
                value={form.project_id || null}
                onChange={(id) => setForm({ ...form, project_id: id ?? '' })}
                includeInactive={includeInactive}
                disabled={pending}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)} />
                {S.TOGGLE_INCLUDE_INACTIVE}
              </label>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-budget">Ngân sách (VND)</Label>
            <Input id="mp-budget" className="col-span-2"
              value={form.budget_vnd}
              onChange={(e) => setForm({ ...form, budget_vnd: e.target.value })}
              placeholder="1250000000" />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-start">Ngày bắt đầu</Label>
            <Input id="mp-start" type="date" className="col-span-2"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label htmlFor="mp-end">Ngày kết thúc</Label>
            <Input id="mp-end" type="date" className="col-span-2"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>

          {budgetWarning && (
            <Alert className="bg-warning/10 border-warning text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{S.BUDGET_WARNING_TITLE}</AlertTitle>
              <AlertDescription>
                {S.BUDGET_WARNING_BODY(formatVndBigint(budgetWarning.headroom))}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          {budgetWarning ? (
            <Button onClick={() => { toast.success('Đã tạo Master Plan'); onOpenChange(false) }}>
              {S.BUDGET_WARNING_ACK}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**⚠ NOTE on `Checkbox`:** Hiện tại chỉ dùng native `<input type="checkbox">` để tránh phải add 1 shadcn component nữa. Nếu design system đã có Checkbox sẵn thì Claude Code replace. Nếu không, để nguyên native — không phải blocker.

**⚠ File size check:** File mới ~200 dòng — sát giới hạn. Nếu quá, split phần banner + helper `formatVndBigint` ra `MasterPlanFormDialog.helpers.ts`.

**6.3 Verify + Commit:**
```bash
npm run type-check && npm run lint && npm run build
git add src/entities/master-plan/api/useMasterPlan.ts src/features/master-plan/ui/MasterPlanFormDialog.tsx
git commit -m "feat(master-plan): replace UUID input with ProjectPicker + budget warning banner

- Replace text input 'Project UUID' with <ProjectPicker> LOV component
- Add includeInactive toggle for closed/cancelled projects
- Handle POST /master-plan response: surface budget warning banner when response.warning=true
- Format headroom VND with BigInt + Intl.NumberFormat('vi-VN') for bigint safety
- useCreateMasterPlan now returns { plan, warning?, headroom? } — preserves envelope-level fields
- All VN copy from project-lookup.strings catalog

Breaking change: useCreateMasterPlan mutation result shape changed from MasterPlan to { plan, warning?, headroom? }
Callers updated: MasterPlanFormDialog (only caller)

Part of FEATURE master-plan-project-lookup Gate 4B (feature layer)"
```

---

### ✅ Step 7 — Static selector tests (existing `npx tsx` pattern)

**Commit:** `test(frontend): add static selector tests for ProjectPicker + MasterPlanFormDialog`

**Background:** `wms-frontend` chưa có vitest/jest/RTL. Pattern hiện tại là static-grep tests chạy qua `npx tsx` (xem `src/pages/__tests__/AllPages.selectors.test.ts`). Gate 4B theo pattern này để không scope creep — backlog `FE-TEST-INFRA-SETUP` sẽ setup runner đúng chuẩn sau.

**7.1 Create `src/features/master-plan/__tests__/MasterPlanFormDialog.selectors.test.ts`** (~50 dòng):
```typescript
/**
 * Static selector verification — MasterPlanFormDialog (master-plan-project-lookup)
 * Run: npx tsx src/features/master-plan/__tests__/MasterPlanFormDialog.selectors.test.ts
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const read = (f: string) => readFileSync(resolve(__dir, '..', f), 'utf8')

const dialog = read('ui/MasterPlanFormDialog.tsx')
const strings = read('constants/project-lookup.strings.ts')

let passed = 0, failed = 0
function assert(label: string, ok: boolean) {
  if (ok) { console.log(`  ✅ ${label}`); passed++ }
  else { console.log(`  ❌ FAIL: ${label}`); failed++ }
}

console.log('\n══ MasterPlanFormDialog ══')
assert('Imports ProjectPicker', dialog.includes("from '@/entities/project'") && dialog.includes('ProjectPicker'))
assert('Imports string catalog', dialog.includes('project-lookup.strings'))
assert('Uses <ProjectPicker id="mp-project" />', dialog.includes('id="mp-project"'))
assert('No hardcoded "Project UUID" label', !dialog.includes('Project UUID'))
assert('Uses LABEL_PROJECT_REQUIRED', dialog.includes('S.LABEL_PROJECT_REQUIRED'))
assert('Budget warning banner present', dialog.includes('BUDGET_WARNING_TITLE'))
assert('Uses BigInt for headroom', dialog.includes('BigInt('))
assert('Uses Intl.NumberFormat vi-VN', dialog.includes("Intl.NumberFormat('vi-VN')"))
assert('Include-inactive checkbox wired', dialog.includes('includeInactive') && dialog.includes('TOGGLE_INCLUDE_INACTIVE'))

console.log('\n══ String catalog ══')
assert('Has LABEL_PROJECT_REQUIRED', strings.includes('LABEL_PROJECT_REQUIRED'))
assert('Has BUDGET_WARNING_TITLE', strings.includes('BUDGET_WARNING_TITLE'))
assert('Has BUDGET_WARNING_BODY function', strings.includes('BUDGET_WARNING_BODY'))
assert('Has all 7 status labels', [
  'STATUS_WON_BID', 'STATUS_ACTIVE', 'STATUS_ON_HOLD',
  'STATUS_SETTLING', 'STATUS_WARRANTY', 'STATUS_CLOSED', 'STATUS_CANCELLED',
].every((k) => strings.includes(k)))
assert('CROSS_ORG_PREFIX present', strings.includes('CROSS_ORG_PREFIX'))

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
```

**7.2 Create `src/entities/project/__tests__/ProjectPicker.selectors.test.ts`** (~40 dòng):
```typescript
/**
 * Static selector verification — ProjectPicker (master-plan-project-lookup)
 * Run: npx tsx src/entities/project/__tests__/ProjectPicker.selectors.test.ts
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const read = (f: string) => readFileSync(resolve(__dir, '..', f), 'utf8')

const picker = read('ui/project-picker/ProjectPicker.tsx')
const hook = read('api/useProjectLookup.ts')

let passed = 0, failed = 0
function assert(label: string, ok: boolean) {
  if (ok) { console.log(`  ✅ ${label}`); passed++ }
  else { console.log(`  ❌ FAIL: ${label}`); failed++ }
}

console.log('\n══ ProjectPicker ══')
assert('Wraps EntityPicker', picker.includes('EntityPicker'))
assert('Imports from shared/ui/entity-picker', picker.includes("'@/shared/ui/entity-picker'"))
assert('Uses string catalog (S.PLACEHOLDER)', picker.includes('S.PLACEHOLDER'))
assert('Renders Badge for status', picker.includes('Badge') && picker.includes('STATUS_VARIANT'))
assert('Cross-org banner uses CROSS_ORG_PREFIX', picker.includes('CROSS_ORG_PREFIX'))
assert('Calls fetchProjectById for hydration', picker.includes('onFetchById={fetchProjectById}'))

console.log('\n══ useProjectLookup ══')
assert('Endpoint /projects/lookup', hook.includes('/projects/lookup'))
assert('Uses status_whitelist (not include_inactive)', hook.includes('status_whitelist'))
assert('PROJECT_ACTIVE_STATUSES = 5 statuses', hook.includes('WON_BID') && hook.includes('WARRANTY'))
assert('fetchProjectById exported', hook.includes('export async function fetchProjectById'))
assert('fetchProjectById returns null on error', hook.includes('return null'))
assert('staleTime set', hook.includes('staleTime'))

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
```

**7.3 Run both tests:**
```bash
npx tsx src/features/master-plan/__tests__/MasterPlanFormDialog.selectors.test.ts
npx tsx src/entities/project/__tests__/ProjectPicker.selectors.test.ts
```

Cả hai phải PASS 100%.

**7.4 Verify + Commit:**
```bash
npm run type-check && npm run lint
git add src/features/master-plan/__tests__/ src/entities/project/__tests__/
git commit -m "test(frontend): add static selector tests for ProjectPicker + MasterPlanFormDialog

- MasterPlanFormDialog.selectors.test.ts: verify ProjectPicker wired, string catalog usage, BigInt format, budget warning banner
- ProjectPicker.selectors.test.ts: verify EntityPicker wrap, endpoint binding, status_whitelist param, fetchProjectById hydration
- Run: npx tsx <path>.test.ts (following existing pattern until vitest infra set up)
- Backlog: FE-TEST-INFRA-SETUP (vitest + RTL)

Part of FEATURE master-plan-project-lookup Gate 4B (test layer)"
```

---

## 4. Final Verification (sau Step 7)

```bash
# Build & quality gates
npm run type-check                                                    # PASS
npm run lint                                                          # 0 errors
npm run build                                                         # PASS

# Static tests
npx tsx src/features/master-plan/__tests__/MasterPlanFormDialog.selectors.test.ts
npx tsx src/entities/project/__tests__/ProjectPicker.selectors.test.ts
npx tsx src/pages/__tests__/AllPages.selectors.test.ts               # No regression
npx tsx src/pages/__tests__/EmployeesPage.selectors.test.ts          # No regression

# Git state
git log --oneline feature/master-plan-project-lookup ^main           # 10 commits total (3 BE 4A + 7 FE 4B)
git status                                                           # Clean
```

---

## 5. STOP Conditions — khi nào phải DỪNG và báo cáo Tech Advisor

DỪNG ngay nếu gặp bất kỳ trường hợp nào sau:

1. **Contract mismatch**: GET `/projects/:id` response shape khác với giả định trong `fetchProjectById` (Step 4.2).
2. **shadcn CLI treo interactive** sau khi dùng `--yes --overwrite`.
3. **Build fail** sau khi thêm `--warning`/`--success` tokens (Tailwind không generate utility).
4. **File quá 200 dòng** sau khi implement — yêu cầu split strategy từ Tech Advisor.
5. **Backend endpoint lookup response thực tế** khác với contract document (test thật bằng curl/Postman nếu cần).
6. **Breaking change nào khác** ngoài `useCreateMasterPlan` đã được flag — ví dụ phát hiện caller khác của `useCreateMasterPlan` sau khi grep.
7. **Test failure** sau Step 7 không tự fix được.

---

## 6. Output format expected

Sau khi hoàn thành 7 steps, báo cáo format sau:

```
GATE 4B COMPLETE — READY FOR TECH ADVISOR REVIEW

Branch: feature/master-plan-project-lookup
Commits added in Gate 4B (newest first):
<N>. <hash> <commit subject>
...

Build status:
- npm run type-check: PASS
- npm run lint: <N> errors, <N> warnings
- npm run build: PASS
- Static tests:
  - MasterPlanFormDialog.selectors: <X>/<X> passed
  - ProjectPicker.selectors: <X>/<X> passed
  - AllPages.selectors (regression): <X>/<X> passed
  - EmployeesPage.selectors (regression): <X>/<X> passed

Files created:
- <path> (<lines> dòng)
...

Files modified:
- <path> (+<add>/-<del> dòng)
...

Cross-stack binding verified:
- Endpoint: GET /projects/lookup ✓
- Query: q, limit, offset, status_whitelist ✓
- Response envelope: { status, message, data: { items, total, limit, offset } } ✓
- Item shape: { id, project_code, project_name, status, stage, organization_id, organization_name } ✓
- POST /master-plan envelope: warning + headroom preserved via useCreateMasterPlan ✓

Open Concerns encountered:
- <nếu có, format C-OBS-N: description + resolution>

Next: Gate 5 (QA) — awaiting Tech Advisor approval.
```

---

## 7. Commitments (tuân thủ)

- [ ] **CHỈ đụng `wms-frontend/`** — không đụng backend, không đụng root docs (trừ tạo test files và modify files trong spec).
- [ ] **KHÔNG hardcode** hex color, VN string trong JSX. Token + catalog only.
- [ ] **File ≤ 200 dòng** — split nếu vượt.
- [ ] **type-check + lint PASS trước mỗi commit**. Không commit tape-around-failures.
- [ ] **KHÔNG push remote** ở bất kỳ step nào.
- [ ] **Preserve MasterPlanFormDialog props contract** `{ open, onOpenChange, target? }`.
- [ ] **useCreateMasterPlan breaking change** — chỉ có 1 caller (đã verify), OK to change.
- [ ] **DỪNG + báo cáo** tại bất kỳ STOP condition nào ở §5.
- [ ] **Conventional Commits** — tuân thủ prefix `feat(scope):` / `test(frontend):`.

---

**Tech Advisor:** Sa Huynh (`sahuynhpt@gmail.com`)
**Date:** 2026-04-22
**Prompt artifact path:** `D:\SHERP\SHERP\docs\claude-code-prompts\FEATURE-master-plan-project-lookup-GATE4B-DEV-FRONTEND.md`
