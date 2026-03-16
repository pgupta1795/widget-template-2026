import type {
  ColumnMeta,
  GridColumnDef,
} from "@/components/data-grid/types/column-types"
import { cn } from "@/components/data-grid/utils/grid-utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, Copy } from "lucide-react"
import { useState } from "react"

interface CodeColumnOptions {
  accessorKey: string
  header: string
  editable?: boolean
  language?: string
  copyable?: boolean
  maxLines?: number
  width?: number
  meta?: Partial<ColumnMeta>
  [key: string]: unknown
}

function CodeCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        void handleCopy()
      }}
      className="ml-1.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  )
}

/**
 * Creates a column definition for displaying source code snippets.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.language - Programming language for syntax highlighting (default: 'text')
 * @param options.copyable - Show a copy button (default: true)
 * @param options.maxLines - Max lines to show before truncating into a tooltip (default: 1)
 * @param options.width - Base width in pixels (default: 220)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * codeColumn({ accessorKey: 'payload', header: 'Payload', language: 'json' })
 */
export function codeColumn(options: CodeColumnOptions): GridColumnDef {
  const {
    accessorKey,
    header,
    editable,
    language = "text",
    copyable = true,
    maxLines = 1,
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
    size: width ?? 220,
    filterFn: "includesString",
    meta: {
      type: "code",
      editable: editable ?? false,
      language,
      copyable,
      maxLines,
      ...extraMeta,
    },
    cell: ({ getValue, column }) => {
      const raw = getValue<string>() ?? ""
      if (!raw) return null

      const meta = column.columnDef.meta as any
      const classNameCell = meta?.classNameCell as string | undefined

      const lines = raw.split("\n")
      const isTruncated = lines.length > maxLines
      const display = isTruncated
        ? lines.slice(0, maxLines).join("\n") + "..."
        : raw

      const codeBlock = (
        <div className={cn("flex min-w-0 items-center", classNameCell)}>
          <code
            className={cn(
              "max-w-full truncate rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px]"
            )}
          >
            {display}
          </code>
          {copyable && <CodeCopyButton value={raw} />}
        </div>
      )

      if (isTruncated) {
        return (
          <Tooltip>
            <TooltipTrigger render={<span className="cursor-default" />}>
              {codeBlock}
            </TooltipTrigger>
            <TooltipContent>
              <pre className="max-w-sm font-mono text-[11px] whitespace-pre-wrap">
                {raw}
              </pre>
            </TooltipContent>
          </Tooltip>
        )
      }

      return codeBlock
    },
    ...rest,
  } as GridColumnDef
}
