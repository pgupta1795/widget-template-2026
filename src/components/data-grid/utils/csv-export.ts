import type { GridRow } from '@/components/data-grid/types/grid-types'
import type { GridColumnDef } from '@/components/data-grid/types/column-types'
import { getCellDisplayValue } from './grid-utils'

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportToCsv(
  rows: GridRow[],
  columns: GridColumnDef[],
  filename = 'export'
): void {
  const visibleColumns = columns.filter(col => col.id !== '__select__' && col.id !== '__expand__')

  // Header row
  const headers = visibleColumns.map(col => {
    const text = typeof col.header === 'string' ? col.header : (col.id ?? '')
    return escapeCsvCell(text)
  })

  // Data rows
  const dataRows = rows.map(row => {
    return visibleColumns.map(col => {
      const key = (col as { accessorKey?: string }).accessorKey ?? col.id ?? ''
      const value = row[key]
      const type = col.meta?.type
      const display = getCellDisplayValue(value, type)
      return escapeCsvCell(display)
    })
  })

  const csvContent = [headers, ...dataRows].map(row => row.join(',')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
