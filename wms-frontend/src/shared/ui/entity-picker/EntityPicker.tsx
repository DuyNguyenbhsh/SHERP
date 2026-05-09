import { useEffect, useRef, useState } from 'react'
import { X, ChevronsUpDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from './useDebouncedValue'
import type { EntityPickerProps, EntityItemBase } from './types'

export function EntityPicker<T extends EntityItemBase>({
  value,
  onChange,
  onSearch,
  onFetchById,
  renderItem,
  renderSelected,
  placeholder,
  emptyText,
  errorText,
  minQueryLength = 0,
  debounceMs = 300,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: EntityPickerProps<T>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const hydratedIdRef = useRef<string | null>(null)
  const debouncedQuery = useDebouncedValue(query, debounceMs)

  // Fetch items when query changes (or on open if minQueryLength=0).
  // setState calls here sync async fetch result into render state — intended.
  useEffect(() => {
    if (!open) return
    if (debouncedQuery.length < minQueryLength) {
      setItems([])
      setError(null)
      return
    }
    let cancelled = false

    setIsLoading(true)
    setError(null)
    onSearch(debouncedQuery)
      .then((res) => {
        if (!cancelled) setItems(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setItems([])
        setError(errorText ?? emptyText ?? 'Có lỗi xảy ra')
        console.error('[EntityPicker] search failed:', err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, open, minQueryLength, onSearch, errorText, emptyText])

  // Hydrate selectedItem in edit mode (fetch label once per value).
  // setState here syncs parent's `value` prop (external source) with internal display state.
  useEffect(() => {
    if (!value) {
      setSelectedItem(null)
      hydratedIdRef.current = null
      return
    }
    if (hydratedIdRef.current === value) return
    if (selectedItem?.id === value) {
      hydratedIdRef.current = value
      return
    }
    if (!onFetchById) return
    let cancelled = false
    onFetchById(value)
      .then((item) => {
        if (cancelled) return
        setSelectedItem(item)
        hydratedIdRef.current = value
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.warn(
          `[EntityPicker] Failed to hydrate selected item for value=${value}.`,
          'Picker will display raw UUID until user re-selects.',
          err,
        )
      })
    return () => {
      cancelled = true
    }
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
          <span
            className={cn('truncate text-left flex-1', !selectedItem && 'text-muted-foreground')}
          >
            {selectedItem ? renderSelected(selectedItem) : placeholder}
          </span>
          <span className="flex items-center gap-1 ml-2">
            {selectedItem && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Xóa lựa chọn"
                onClick={handleClear}
                className="rounded hover:bg-muted p-0.5"
              >
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
            {!isLoading && error && (
              <div
                role="alert"
                className="px-3 py-3 text-sm text-destructive flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {!isLoading && !error && items.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            {!isLoading && !error && items.length > 0 && (
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
