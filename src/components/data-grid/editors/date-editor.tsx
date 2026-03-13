import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { EditorProps } from "@/components/data-grid/types/editor-types"
import { format, isValid, parseISO } from "date-fns"
import { useEffect, useState } from "react"

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return isValid(value) ? value : undefined
  if (typeof value === "string") {
    const d = parseISO(value)
    return isValid(d) ? d : undefined
  }
  if (typeof value === "number") {
    const d = new Date(value)
    return isValid(d) ? d : undefined
  }
  return undefined
}

export function DateEditor({
  value,
  onChange,
  onSave,
  onCancel,
}: EditorProps<unknown>) {
  const [open, setOpen] = useState(true)
  const [selected, setSelected] = useState<Date | undefined>(() =>
    parseDate(value)
  )

  // Close + cancel on Escape via keydown on document
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        onCancel()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onCancel])

  const handleSelect = (date: Date | undefined) => {
    setSelected(date)
    const isoVal = date ? format(date, "yyyy-MM-dd") : null
    onChange(isoVal as unknown as never)
    setOpen(false)
    onSave()
  }

  const handleClear = () => {
    setSelected(undefined)
    onChange(null as unknown as never)
    setOpen(false)
    onSave()
  }

  const displayLabel = selected
    ? format(selected, "MMM d, yyyy")
    : "Pick a date"

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false)
          onCancel()
        }
      }}
    >
      <PopoverTrigger
        className={cn(
          "h-full w-full px-(--cell-px) py-(--cell-py)",
          "bg-transparent text-left outline-none",
          "text-(length:--font-size) text-muted-foreground"
        )}
      >
        {displayLabel}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
