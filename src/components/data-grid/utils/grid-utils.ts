import type { Table, Column, ColumnFiltersState } from '@tanstack/react-table'
import type { GridRow } from '@/components/data-grid/types/grid-types'
import type { ColumnType } from '@/components/data-grid/types/column-types'
export { cn } from '@/lib/utils'

export function getCellDisplayValue(value: unknown, type: ColumnType | undefined): string {
  if (value === null || value === undefined) return ''

  switch (type) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'date':
      if (value instanceof Date) return value.toLocaleDateString()
      return String(value)
    case 'multi-value':
      if (Array.isArray(value)) return value.join(', ')
      return String(value)
    case 'number':
      return typeof value === 'number' ? value.toString() : String(value)
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function getColumnHeaderText(column: Column<GridRow>): string {
  const def = column.columnDef
  if (typeof def.header === 'string') return def.header
  return column.id
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value
  return [value]
}

// Deterministic skeleton widths based on column type and index
const SKELETON_WIDTHS: Record<string, number[]> = {
  string: [55, 70, 60, 65, 58, 72, 63],
  number: [40, 45, 42, 50, 41, 48, 44],
  date: [65, 65, 65, 65, 65, 65, 65],
  'multi-value': [75, 80, 70, 78, 72, 82, 68],
  select: [45, 50, 42, 48, 44, 52, 40],
  boolean: [30, 35, 30, 35, 30, 35, 30],
  code: [60, 70, 55, 65, 58, 68, 52],
  custom: [60, 60, 60, 60, 60, 60, 60],
}

export function getSkeletonWidth(type: ColumnType | undefined, colIndex: number): string {
  const widths = SKELETON_WIDTHS[type ?? 'string'] ?? SKELETON_WIDTHS.string
  const width = widths[colIndex % widths.length]
  return `${width}%`
}

export function hasActiveFilters(columnFilters: ColumnFiltersState, globalFilter: string): boolean {
  return columnFilters.length > 0 || globalFilter.length > 0
}

export function clearAllFilters(table: Table<GridRow>): void {
  table.resetColumnFilters()
  table.resetGlobalFilter()
}

export function mergeChildrenIntoTree(
  rows: GridRow[],
  parentId: string,
  children: GridRow[]
): GridRow[] {
  return rows.map(row => {
    if (row.id === parentId) {
      return { ...row, children, _hasChildren: children.length > 0 }
    }
    if (row.children && row.children.length > 0) {
      return { ...row, children: mergeChildrenIntoTree(row.children, parentId, children) }
    }
    return row
  })
}
