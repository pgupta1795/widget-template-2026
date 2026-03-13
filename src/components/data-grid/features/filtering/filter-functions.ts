import type { FilterFn } from "@tanstack/react-table"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import type { ColumnType } from "@/components/data-grid/types/column-types"

// Module augmentation for custom filter function names
declare module "@tanstack/react-table" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
    stringFilter: FilterFn<unknown>
    dateRangeFilter: FilterFn<unknown>
    multiValueFilter: FilterFn<unknown>
    selectFilter: FilterFn<unknown>
    booleanFilter: FilterFn<unknown>
  }
}

// String filter — supports { value, operator } shape
export const stringFilter: FilterFn<GridRow> = (
  row,
  columnId,
  filterValue: unknown,
): boolean => {
  if (!filterValue || typeof filterValue !== "object") return true
  const { value, operator } = filterValue as {
    value: string
    operator: "contains" | "startsWith"
  }
  if (!value) return true
  const cellValue = String(row.getValue(columnId) ?? "").toLowerCase()
  const q = value.toLowerCase()
  return operator === "startsWith" ? cellValue.startsWith(q) : cellValue.includes(q)
}
stringFilter.autoRemove = (val: unknown) => {
  if (!val || typeof val !== "object") return true
  return !(val as { value?: string }).value
}

// Date range filter — { from?: string, to?: string } (ISO strings)
export const dateRangeFilter: FilterFn<GridRow> = (
  row,
  columnId,
  filterValue: unknown,
): boolean => {
  if (!filterValue || typeof filterValue !== "object") return true
  const { from, to } = filterValue as { from?: string; to?: string }
  if (!from && !to) return true
  const cellRaw = row.getValue<string | Date | null>(columnId)
  if (cellRaw === null || cellRaw === undefined) return false
  const cellDate = new Date(cellRaw)
  if (isNaN(cellDate.getTime())) return false
  if (from) {
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    if (cellDate < fromDate) return false
  }
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    if (cellDate > toDate) return false
  }
  return true
}
dateRangeFilter.autoRemove = (val: unknown) => {
  if (!val || typeof val !== "object") return true
  const { from, to } = val as { from?: string; to?: string }
  return !from && !to
}

// Multi-value filter — filters array cells for any match
export const multiValueFilter: FilterFn<GridRow> = (
  row,
  columnId,
  filterValue: unknown,
): boolean => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  const cellRaw = row.getValue<string[] | string | null>(columnId)
  if (cellRaw === null || cellRaw === undefined) return false
  const cellArr = Array.isArray(cellRaw)
    ? cellRaw.map(String)
    : [String(cellRaw)]
  return (filterValue as string[]).some((v) => cellArr.includes(v))
}
multiValueFilter.autoRemove = (val: unknown) =>
  !Array.isArray(val) || val.length === 0

// Select filter — checks if single cell value is in selected set
export const selectFilter: FilterFn<GridRow> = (
  row,
  columnId,
  filterValue: unknown,
): boolean => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  const cellValue = String(row.getValue(columnId) ?? "")
  return (filterValue as string[]).includes(cellValue)
}
selectFilter.autoRemove = (val: unknown) =>
  !Array.isArray(val) || val.length === 0

// Boolean filter — 'true' | 'false' (undefined = all)
export const booleanFilter: FilterFn<GridRow> = (
  row,
  columnId,
  filterValue: unknown,
): boolean => {
  if (!filterValue || filterValue === "all") return true
  const cellValue = Boolean(row.getValue(columnId))
  return filterValue === "true" ? cellValue : !cellValue
}
booleanFilter.autoRemove = (val: unknown) => !val || val === "all"

// Maps column type to custom filter function name
export function filterFnForType(type: ColumnType | undefined): string | undefined {
  switch (type) {
    case "string":
    case "code":
      return "stringFilter"
    case "number":
      return "inNumberRange"
    case "date":
      return "dateRangeFilter"
    case "multi-value":
      return "multiValueFilter"
    case "select":
      return "selectFilter"
    case "boolean":
      return "booleanFilter"
    default:
      return undefined
  }
}
