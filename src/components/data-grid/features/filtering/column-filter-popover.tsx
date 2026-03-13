import type {
  ColumnMeta,
  ColumnType,
  SelectOption,
} from "@/components/data-grid/types/column-types"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Column } from "@tanstack/react-table"
import { ListFilter } from "lucide-react"
import React from "react"
import type { DateRange } from "react-day-picker"
import { FacetBadge } from "./facet-badge"

interface ColumnFilterPopoverProps {
  column: Column<GridRow, unknown>
}

export function ColumnFilterPopover({ column }: ColumnFilterPopoverProps) {
  const meta = column.columnDef.meta as ColumnMeta | undefined
  const columnType = meta?.type ?? "string"
  const isFiltered = column.getIsFiltered()

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center justify-center focus:outline-none"
        aria-label="Filter column"
      >
        {isFiltered ? (
          <FacetBadge count={1} />
        ) : (
          <ListFilter className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover/header:opacity-100" />
        )}
      </PopoverTrigger>
      <PopoverContent
        className={columnType === "number" ? "w-64" : "w-56"}
        side="bottom"
        align="start"
      >
        <div className="flex flex-col gap-2">
          <FilterContent column={column} columnType={columnType} meta={meta} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start text-xs text-muted-foreground hover:text-foreground"
            onClick={() => column.setFilterValue(undefined)}
          >
            Clear filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch to type-specific filter UI
// ─────────────────────────────────────────────────────────────────────────────

function FilterContent({
  column,
  columnType,
  meta,
}: {
  column: Column<GridRow, unknown>
  columnType: ColumnType
  meta: ColumnMeta | undefined
}) {
  switch (columnType) {
    case "string":
    case "code":
      return <StringFilter column={column} />
    case "number":
      return <NumberFilter column={column} />
    case "date":
      return <DateFilter column={column} />
    case "multi-value":
      return <MultiValueFilter column={column} />
    case "select":
      return <SelectTypeFilter column={column} options={meta?.options} />
    case "boolean":
      return <BooleanFilter column={column} />
    default:
      return <StringFilter column={column} />
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// String / Code filter
// ─────────────────────────────────────────────────────────────────────────────

type StringFilterValue = { value: string; operator: "contains" | "startsWith" }

function StringFilter({ column }: { column: Column<GridRow, unknown> }) {
  const current = (column.getFilterValue() as
    | StringFilterValue
    | undefined) ?? {
    value: "",
    operator: "contains" as const,
  }
  const [localValue, setLocalValue] = React.useState(current.value)
  const [operator, setOperator] = React.useState<"contains" | "startsWith">(
    current.operator
  )

  const apply = (v: string, op: "contains" | "startsWith") => {
    column.setFilterValue(v ? { value: v, operator: op } : undefined)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {(["contains", "startsWith"] as const).map((op) => (
          <button
            key={op}
            onClick={() => {
              setOperator(op)
              apply(localValue, op)
            }}
            className={`rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
              operator === op
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {op === "contains" ? "contains" : "starts with"}
          </button>
        ))}
      </div>
      <Input
        className="h-7 text-xs"
        placeholder="Filter..."
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value)
          apply(e.target.value, operator)
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Number filter — dual-thumb range slider
// ─────────────────────────────────────────────────────────────────────────────

function NumberFilter({ column }: { column: Column<GridRow, unknown> }) {
  const facetMinMax = column.getFacetedMinMaxValues()
  const facetMin = facetMinMax?.[0] ?? 0
  const facetMax = facetMinMax?.[1] ?? 100

  const currentFilter = column.getFilterValue() as [number, number] | undefined
  const [range, setRange] = React.useState<[number, number]>([
    currentFilter?.[0] ?? facetMin,
    currentFilter?.[1] ?? facetMax,
  ])

  const handleSliderChange = (values: number[]) => {
    const next: [number, number] = [values[0], values[1]]
    setRange(next)
    column.setFilterValue(next)
  }

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (isNaN(v)) return
    const next: [number, number] = [v, range[1]]
    setRange(next)
    column.setFilterValue(next)
  }

  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (isNaN(v)) return
    const next: [number, number] = [range[0], v]
    setRange(next)
    column.setFilterValue(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <Input
          className="h-6 w-full text-xs"
          type="number"
          value={range[0]}
          onChange={handleMinInput}
          placeholder="Min"
        />
        <span className="self-center text-xs text-muted-foreground">–</span>
        <Input
          className="h-6 w-full text-xs"
          type="number"
          value={range[1]}
          onChange={handleMaxInput}
          placeholder="Max"
        />
      </div>
      <Slider
        min={facetMin}
        max={facetMax}
        value={range}
        onValueChange={(value: number | readonly number[]) => {
          const arr = Array.isArray(value) ? [...value] : [value as number]
          handleSliderChange(arr)
        }}
        className="my-1"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{facetMin}</span>
        <span>{facetMax}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Date range filter — dual calendar
// ─────────────────────────────────────────────────────────────────────────────

type DateFilterValue = { from?: string; to?: string }

function DateFilter({ column }: { column: Column<GridRow, unknown> }) {
  const current = column.getFilterValue() as DateFilterValue | undefined
  const [range, setRange] = React.useState<DateRange>({
    from: current?.from ? new Date(current.from) : undefined,
    to: current?.to ? new Date(current.to) : undefined,
  })

  const handleSelect = (selected: DateRange | undefined) => {
    setRange(selected ?? { from: undefined, to: undefined })
    column.setFilterValue(
      selected?.from || selected?.to
        ? {
            from: selected?.from?.toISOString(),
            to: selected?.to?.toISOString(),
          }
        : undefined
    )
  }

  return (
    <Calendar
      mode="range"
      selected={range}
      onSelect={handleSelect}
      className="p-0 text-xs [--cell-size:--spacing(6)]"
      numberOfMonths={1}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-value filter — checkbox list with facet counts
// ─────────────────────────────────────────────────────────────────────────────

function MultiValueFilter({ column }: { column: Column<GridRow, unknown> }) {
  const facetMap = column.getFacetedUniqueValues()
  const selected = (column.getFilterValue() as string[] | undefined) ?? []

  // Flatten: multi-value cells may be arrays; accumulate per-tag counts
  const tagCounts = React.useMemo(() => {
    const acc = new Map<string, number>()
    facetMap.forEach((count, rawValue) => {
      if (Array.isArray(rawValue)) {
        rawValue.forEach((tag) => {
          acc.set(String(tag), (acc.get(String(tag)) ?? 0) + count)
        })
      } else if (rawValue !== null && rawValue !== undefined) {
        const k = String(rawValue)
        acc.set(k, (acc.get(k) ?? 0) + count)
      }
    })
    return acc
  }, [facetMap])

  const sortedTags = React.useMemo(
    () => [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    [tagCounts]
  )

  const toggle = (tag: string) => {
    const next = selected.includes(tag)
      ? selected.filter((v) => v !== tag)
      : [...selected, tag]
    column.setFilterValue(next.length ? next : undefined)
  }

  return (
    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
      {sortedTags.map(([tag, count]) => (
        <label
          key={tag}
          className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted/40"
        >
          <Checkbox
            checked={selected.includes(tag)}
            onCheckedChange={() => toggle(tag)}
            className="h-3 w-3"
          />
          <span className="flex-1 truncate">{tag}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            ({count})
          </span>
        </label>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Select filter — checkbox list with facet counts
// ─────────────────────────────────────────────────────────────────────────────

function SelectTypeFilter({
  column,
  options,
}: {
  column: Column<GridRow, unknown>
  options?: SelectOption[]
}) {
  const facetMap = column.getFacetedUniqueValues()
  const selected = (column.getFilterValue() as string[] | undefined) ?? []

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const items = React.useMemo(() => {
    const fromFacet = [...facetMap.entries()]
      .filter(([v]) => v !== null && v !== undefined)
      .map(([v, count]) => ({ value: String(v), count }))
      .sort((a, b) => b.count - a.count)

    if (options) {
      return options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        count: facetMap.get(opt.value) ?? 0,
      }))
    }
    return fromFacet.map((f) => ({
      value: f.value,
      label: f.value,
      count: f.count,
    }))
  }, [facetMap, options])

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    column.setFilterValue(next.length ? next : undefined)
  }

  return (
    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
      {items.map((item) => (
        <label
          key={item.value}
          className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted/40"
        >
          <Checkbox
            checked={selected.includes(item.value)}
            onCheckedChange={() => toggle(item.value)}
            className="h-3 w-3"
          />
          <span className="flex-1 truncate">{item.label}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            ({item.count})
          </span>
        </label>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Boolean filter — All / True / False toggle group
// ─────────────────────────────────────────────────────────────────────────────

type BoolVal = "all" | "true" | "false"

function BooleanFilter({ column }: { column: Column<GridRow, unknown> }) {
  const raw = column.getFilterValue() as string | undefined
  const current: BoolVal =
    raw === "true" ? "true" : raw === "false" ? "false" : "all"

  const handleSelect = (val: BoolVal) => {
    column.setFilterValue(val === "all" ? undefined : val)
  }

  return (
    <ToggleGroup variant="outline" size="sm" className="w-full">
      {(["all", "true", "false"] as BoolVal[]).map((val) => (
        <ToggleGroupItem
          key={val}
          pressed={current === val}
          onPressedChange={(p: boolean) => {
            if (p) handleSelect(val)
          }}
          className="flex-1 text-xs"
        >
          {val === "all" ? "All" : val === "true" ? "True" : "False"}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
