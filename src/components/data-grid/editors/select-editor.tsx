import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { EditorProps } from "@/components/data-grid/types/editor-types"
import { Check } from "lucide-react"
import { useState, useEffect } from "react"

export function SelectEditor({
  value,
  onChange,
  onSave,
  onCancel,
  meta,
}: EditorProps<string>) {
  const [open, setOpen] = useState(true)
  const options = meta?.options ?? []
  const current = String(value ?? "")

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

  const handleSelect = (optValue: string) => {
    onChange(optValue)
    setOpen(false)
    onSave()
  }

  const currentOpt = options.find((o) => o.value === current)

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
          "text-(length:--font-size)"
        )}
      >
        {currentOpt?.label ?? current ?? "Select…"}
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        {options.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "w-full justify-start gap-2 px-2 py-1.5 text-sm",
              opt.value === current && "bg-accent/50"
            )}
          >
            {opt.color && (
              <span
                className={cn(
                  "inline-block h-2 w-2 shrink-0 rounded-full",
                  opt.color
                )}
              />
            )}
            <span className="flex-1 text-left">{opt.label}</span>
            {opt.value === current && (
              <Check className="h-3 w-3 shrink-0 text-primary" />
            )}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
