import type {
  ColumnMeta,
  GridColumnDef,
} from "@/components/data-grid/types/column-types"
import { cn } from "@/components/data-grid/utils/grid-utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, X } from "lucide-react"

interface BooleanColumnOptions {
  accessorKey: string
  header: string
  editable?: boolean
  trueLabel?: string
  falseLabel?: string
  renderAs?: "badge" | "checkbox" | "icon"
  width?: number
  meta?: Partial<ColumnMeta>
  [key: string]: unknown
}

/**
 * Creates a column definition for boolean data.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.trueLabel - Label to show when true (default: 'Yes')
 * @param options.falseLabel - Label to show when false (default: 'No')
 * @param options.renderAs - Visual style: 'badge', 'checkbox', or 'icon' (default: 'badge')
 * @param options.width - Base width in pixels (default: 100)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * booleanColumn({ accessorKey: 'isActive', header: 'Active', renderAs: 'icon' })
 */
export function booleanColumn(options: BooleanColumnOptions): GridColumnDef {
  const {
    accessorKey,
    header,
    editable,
    trueLabel = "Yes",
    falseLabel = "No",
    renderAs = "badge",
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
    size: width ?? 100,
    enableSorting: true,
    meta: {
      type: "boolean",
      editable: editable ?? false,
      trueLabel,
      falseLabel,
      renderAs,
      ...extraMeta,
    },
    cell: ({ getValue, column }) => {
      const value = Boolean(getValue())
      const meta = column.columnDef.meta as any
      const classNameCell = meta?.classNameCell as string | undefined

      if (renderAs === "checkbox") {
        return (
          <div className={cn("pointer-events-none flex justify-center", classNameCell)}>
            <Checkbox
              checked={value}
              disabled
              aria-label={value ? trueLabel : falseLabel}
            />
          </div>
        )
      }

      if (renderAs === "icon") {
        return (
          <div className={cn("flex justify-center", classNameCell)}>
            {value ? (
              <Check className="h-4 w-4 text-emerald-500" aria-label={trueLabel} />
            ) : (
              <X
                className="h-4 w-4 text-muted-foreground"
                aria-label={falseLabel}
              />
            )}
          </div>
        )
      }

      // default: badge
      return (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium",
            value
              ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
              : "text-muted-foreground",
            classNameCell
          )}
        >
          {value ? trueLabel : falseLabel}
        </Badge>
      )
    },
    ...rest,
  } as GridColumnDef
}
