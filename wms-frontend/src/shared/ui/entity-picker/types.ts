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
