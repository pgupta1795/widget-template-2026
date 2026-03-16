import type {
  ColumnMeta,
  GridColumnDef,
  SelectOption,
} from "@/components/data-grid/types/column-types"
import { cn } from "@/components/data-grid/utils/grid-utils"
import { Badge } from "@/components/ui/badge"

interface SelectColumnOptions {
  accessorKey: string
  header: string
  editable?: boolean
  options: SelectOption[]
  width?: number
  meta?: Partial<ColumnMeta>
  [key: string]: unknown
}

const DEFAULT_COLORS: Record<string, string> = {
  active:
    "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
  draft:
    "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800",
  obsolete:
    "bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:text-zinc-400 dark:border-zinc-700",
  review:
    "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800",
}

/**
 * Creates a column definition for categorical data with a badge representation.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.options - Array of available SelectOption objects for display and editing
 * @param options.width - Base width in pixels (default: 140)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * selectColumn({ accessorKey: 'status', header: 'Status', options: [{ value: 'active', label: 'Active' }] })
 */
export function selectColumn(options: SelectColumnOptions): GridColumnDef {
  const {
    accessorKey,
    header,
    editable,
    options: selectOptions,
    width,
    meta: extraMeta,
    ...rest
  } = options

  const classNameHeader = extraMeta?.classNameHeader as string | undefined

  return {
    accessorKey,
    header: classNameHeader
      ? ({ column }) => (
          <div className={classNameHeader}>{header}</div>
        )
      : header,
    size: width ?? 140,
    meta: {
      type: "select",
      editable: editable ?? false,
      options: selectOptions,
      ...extraMeta,
    },
    cell: ({ getValue, column }) => {
      const value = getValue<string>()
      if (!value) return null
      const meta = column.columnDef.meta as any
      const classNameCell = meta?.classNameCell as string | undefined
      const opt = selectOptions.find((o) => o.value === value)
      const label = opt?.label ?? value
      const colorClass = opt?.color ?? DEFAULT_COLORS[value] ?? ""
      return (
        <Badge
          variant="outline"
          className={cn("text-xs font-medium capitalize", colorClass, classNameCell)}
        >
          {label}
        </Badge>
      )
    },
    ...rest,
  } as GridColumnDef
}
