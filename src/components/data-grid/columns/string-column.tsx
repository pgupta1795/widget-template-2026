import type { ColumnMeta, GridColumnDef } from '@/components/data-grid/types/column-types'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface StringColumnOptions {
  accessorKey: string
  header: string
  editable?: boolean
  copyable?: boolean
  width?: number
  minWidth?: number
  meta?: Partial<ColumnMeta>
  [key: string]: unknown
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={e => { e.stopPropagation(); void handleCopy() }}
      className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      aria-label="Copy value"
    >
      {copied
        ? <Check className="h-3 w-3 text-emerald-500" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  )
}

/**
 * Creates a string column definition.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.copyable - Show copy button on cell hover (default: false)
 * @param options.width - Base width in pixels (default: 200)
 * @param options.minWidth - Minimum width of the column layout (default: 80)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * stringColumn({ accessorKey: 'name', header: 'Name', editable: true, copyable: true })
 */
export function stringColumn(options: StringColumnOptions): GridColumnDef {
  const { accessorKey, header, editable, copyable, width, minWidth, meta: extraMeta, ...rest } = options

  return {
    accessorKey,
    header,
    size: width ?? 200,
    minSize: minWidth ?? 80,
    filterFn: 'includesString',
    meta: {
      type: 'string',
      editable: editable ?? false,
      copyable: copyable ?? false,
      ...extraMeta,
    },
    cell: ({ getValue }) => {
      const value = getValue<string>() ?? ''
      return (
        <div className="flex items-center group truncate">
          <span className="truncate">{value}</span>
          {copyable && value && <CopyButton value={value} />}
        </div>
      )
    },
    ...rest,
  } as GridColumnDef
}
