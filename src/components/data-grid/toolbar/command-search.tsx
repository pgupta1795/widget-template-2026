// src/components/data-grid/toolbar/command-search.tsx
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandSearchProps {
  command: ToolbarCommand
  ctx: ToolbarContext
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function CommandSearch({ command, ctx }: CommandSearchProps) {
  const isServerSide = Boolean(command.apiNodeId)
  const debounceMs = command.debounceMs ?? 300
  const paramName = command.queryParamName ?? 'q'

  // For client-side: sync with globalFilter as the source of truth
  // For server-side: manage local state independently
  const [localValue, setLocalValue] = useState(
    isServerSide ? '' : ctx.globalFilter,
  )

  // Keep client-side input in sync when globalFilter changes externally
  useEffect(() => {
    if (!isServerSide) {
      setLocalValue(ctx.globalFilter)
    }
  }, [ctx.globalFilter, isServerSide])

  const debouncedValue = useDebounce(localValue, isServerSide ? debounceMs : 0)

  // Fire the search action when debounced value changes
  useEffect(() => {
    if (isServerSide) {
      ctx.onSearch?.(paramName, debouncedValue)
    } else {
      ctx.setGlobalFilter(debouncedValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue])

  const handleClear = () => {
    setLocalValue('')
    if (isServerSide) {
      ctx.onSearch?.(paramName, '')
    } else {
      ctx.setGlobalFilter('')
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={command.placeholder ?? 'Search...'}
        value={localValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
        className={cn(
          'h-8 w-56 pl-8 text-sm transition-[width] duration-200 focus:w-72',
          command.inputClassName,
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
