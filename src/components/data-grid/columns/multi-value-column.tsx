import type {
  ColumnMeta,
  GridColumnDef,
  SelectOption,
} from "@/components/data-grid/types/column-types"
import { toArray } from "@/components/data-grid/utils/grid-utils"
import { Badge } from "@/components/ui/badge"

interface MultiValueColumnOptions {
  accessorKey: string
  header: string
  editable?: boolean
  options?: SelectOption[]
  maxVisible?: number
  width?: number
  meta?: Partial<ColumnMeta>
  [key: string]: unknown
}

/**
 * Creates a column definition for rendering an array of strings as badges.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.options - Optional predefined select options if editing as a multi-select
 * @param options.maxVisible - Maximum number of badges to display before truncating (default: 3)
 * @param options.width - Base width in pixels (default: 240)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * multiValueColumn({ accessorKey: 'tags', header: 'Tags', maxVisible: 2 })
 */
export function multiValueColumn(
  options: MultiValueColumnOptions
): GridColumnDef {
  const {
    accessorKey,
    header,
    editable,
    options: selectOptions,
    maxVisible = 3,
    width,
    meta: extraMeta,
    ...rest
  } = options

  return {
    accessorKey,
    header,
    size: width ?? 240,
    meta: {
      type: "multi-value",
      editable: editable ?? false,
      options: selectOptions,
      maxVisible,
      ...extraMeta,
    },
    cell: ({ getValue }) => {
      const values = toArray<string>(getValue<string | string[] | null>())
      if (!values.length) return null
      const visible = values.slice(0, maxVisible)
      const remaining = values.length - visible.length
      return (
        <div className="flex flex-wrap items-center gap-1">
          {visible.map((v, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="px-1.5 py-0.5 text-xs font-normal"
            >
              {v}
            </Badge>
          ))}
          {remaining > 0 && (
            <Badge
              variant="outline"
              className="px-1.5 py-0.5 text-xs font-normal text-muted-foreground"
            >
              +{remaining}
            </Badge>
          )}
        </div>
      )
    },
    ...rest,
  } as GridColumnDef
}
