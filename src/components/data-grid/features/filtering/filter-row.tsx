import { useDataGridContext } from "@/components/data-grid/data-grid-context"
import type {
  ColumnMeta,
  ColumnType,
} from "@/components/data-grid/types/column-types"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"
import type { Column, Header } from "@tanstack/react-table"
import React from "react"

export function FilterRow() {
  const { table } = useDataGridContext()
  const headerGroups = table.getHeaderGroups()
  const leafHeaderGroup = headerGroups[headerGroups.length - 1]

  return (
    <TableRow className="border-b-2 border-border bg-background">
      {leafHeaderGroup.headers.map((header) => (
        <FilterRowCell key={header.id} header={header} />
      ))}
    </TableRow>
  )
}

function FilterRowCell({ header }: { header: Header<GridRow, unknown> }) {
  const { column } = header
  const meta = column.columnDef.meta as ColumnMeta | undefined
  const columnType = meta?.type ?? "string"

  return (
    <TableCell
      style={{ width: `${header.getSize()}px` }}
      className="px-(--cell-px) py-1"
    >
      {!header.isPlaceholder && (
        <FilterRowControl column={column} columnType={columnType} meta={meta} />
      )}
    </TableCell>
  )
}

function FilterRowControl({
  column,
  columnType,
  meta,
}: {
  column: Column<GridRow, unknown>
  columnType: ColumnType
  meta: ColumnMeta | undefined
}) {
  const inputClass =
    "h-7 text-xs border-0 bg-transparent focus:ring-1 focus:ring-primary/40 px-1.5"

  switch (columnType) {
    case "string":
    case "code":
      return <StringRowFilter column={column} className={inputClass} />
    case "number":
      return <NumberRowFilter column={column} className={inputClass} />
    case "date":
      return <DateRowFilter column={column} className={inputClass} />
    case "select":
      return (
        <SelectRowFilter
          column={column}
          className={inputClass}
          options={meta?.options}
        />
      )
    case "multi-value":
      return <StringRowFilter column={column} className={inputClass} />
    case "boolean":
      return <BooleanRowFilter column={column} />
    default:
      return <StringRowFilter column={column} className={inputClass} />
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type row controls
// ─────────────────────────────────────────────────────────────────────────────

function StringRowFilter({
  column,
  className,
}: {
  column: Column<GridRow, unknown>
  className: string
}) {
  const current = column.getFilterValue() as
    | { value: string; operator: "contains" | "startsWith" }
    | undefined
  const [value, setValue] = React.useState(current?.value ?? "")

  React.useEffect(() => {
    const v = (
      column.getFilterValue() as { value: string; operator: string } | undefined
    )?.value
    if (v !== value) setValue(v ?? "")
    // only sync when filter is cleared externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column.getFilterValue()])

  return (
    <Input
      className={className}
      placeholder="Filter…"
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        column.setFilterValue(
          e.target.value
            ? { value: e.target.value, operator: "contains" }
            : undefined
        )
      }}
    />
  )
}

function NumberRowFilter({
  column,
  className,
}: {
  column: Column<GridRow, unknown>
  className: string
}) {
  const current = column.getFilterValue() as [number, number] | undefined
  const [min, setMin] = React.useState(
    current?.[0] !== undefined ? String(current[0]) : ""
  )
  const [max, setMax] = React.useState(
    current?.[1] !== undefined ? String(current[1]) : ""
  )

  const commit = (minVal: string, maxVal: string) => {
    const minN = minVal !== "" ? parseFloat(minVal) : undefined
    const maxN = maxVal !== "" ? parseFloat(maxVal) : undefined
    if (minN === undefined && maxN === undefined) {
      column.setFilterValue(undefined)
    } else {
      const facetMinMax = column.getFacetedMinMaxValues()
      column.setFilterValue([
        minN ?? facetMinMax?.[0] ?? 0,
        maxN ?? facetMinMax?.[1] ?? Infinity,
      ])
    }
  }

  return (
    <div className="flex gap-1">
      <Input
        className={className + " w-1/2"}
        type="number"
        placeholder="Min"
        value={min}
        onChange={(e) => {
          setMin(e.target.value)
          commit(e.target.value, max)
        }}
      />
      <Input
        className={className + " w-1/2"}
        type="number"
        placeholder="Max"
        value={max}
        onChange={(e) => {
          setMax(e.target.value)
          commit(min, e.target.value)
        }}
      />
    </div>
  )
}

function DateRowFilter({
  column,
  className,
}: {
  column: Column<GridRow, unknown>
  className: string
}) {
  const current = column.getFilterValue() as
    | { from?: string; to?: string }
    | undefined
  const [from, setFrom] = React.useState(
    current?.from ? new Date(current.from).toISOString().slice(0, 10) : ""
  )
  const [to, setTo] = React.useState(
    current?.to ? new Date(current.to).toISOString().slice(0, 10) : ""
  )

  const commit = (f: string, t: string) => {
    column.setFilterValue(
      f || t
        ? {
            from: f ? new Date(f).toISOString() : undefined,
            to: t ? new Date(t).toISOString() : undefined,
          }
        : undefined
    )
  }

  return (
    <div className="flex gap-1">
      <Input
        className={className + " w-1/2"}
        type="date"
        value={from}
        onChange={(e) => {
          setFrom(e.target.value)
          commit(e.target.value, to)
        }}
      />
      <Input
        className={className + " w-1/2"}
        type="date"
        value={to}
        onChange={(e) => {
          setTo(e.target.value)
          commit(from, e.target.value)
        }}
      />
    </div>
  )
}

import type { SelectOption } from "@/components/data-grid/types/column-types"

function SelectRowFilter({
  column,
  className,
  options,
}: {
  column: Column<GridRow, unknown>
  className: string
  options?: SelectOption[]
}) {
  const facetMap = column.getFacetedUniqueValues()
  const items = options
    ? options.map((o) => ({ value: o.value, label: o.label }))
    : [...facetMap.keys()]
        .filter((v) => v !== null && v !== undefined)
        .map((v) => ({ value: String(v), label: String(v) }))

  const current = (column.getFilterValue() as string[] | undefined) ?? []

  return (
    <Select
      value={current[0] ?? ""}
      onValueChange={(val) => {
        column.setFilterValue(val && val !== "__all__" ? [val] : undefined)
      }}
    >
      <SelectTrigger
        className={
          className + " w-full rounded-none border border-border bg-background"
        }
      >
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function BooleanRowFilter({ column }: { column: Column<GridRow, unknown> }) {
  const raw = column.getFilterValue() as string | undefined
  const current = raw === "true" ? "true" : raw === "false" ? "false" : "all"

  return (
    <div className="flex gap-1">
      {(["all", "✓", "✗"] as const).map((label, i) => {
        const val = i === 0 ? "all" : i === 1 ? "true" : "false"
        const active = current === val
        return (
          <Button
            key={val}
            variant={active ? "outline" : "ghost"}
            size="xs"
            onClick={() =>
              column.setFilterValue(val === "all" ? undefined : val)
            }
            className={`h-7 flex-1 rounded-none text-[11px] transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}
