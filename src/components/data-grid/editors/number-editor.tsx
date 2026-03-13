import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EditorProps } from "@/components/data-grid/types/editor-types"
import React, { useEffect, useRef, useState } from "react"

export function NumberEditor({
  value,
  onChange,
  onSave,
  onCancel,
  meta,
}: EditorProps<number>) {
  const ref = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(
    value != null && !isNaN(Number(value)) ? String(value) : ""
  )

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const num = parseFloat(localValue)
      onChange(isNaN(num) ? (value as number) : num)
      onSave()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
    // Allow: digits, dot, minus, backspace, delete, arrow keys, tab
    const allowed =
      /[0-9.\\-]/.test(e.key) ||
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
        e.key
      ) ||
      e.ctrlKey ||
      e.metaKey
    if (!allowed) e.preventDefault()
  }

  const handleBlur = () => {
    if (meta?.saveOnBlur !== false) {
      const num = parseFloat(localValue)
      onChange(isNaN(num) ? (value as number) : num)
      onSave()
    }
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        "h-full w-full px-(--cell-px) py-(--cell-py)",
        "bg-transparent outline-none",
        "text-right font-mono text-(length:--font-size)",
        "rounded-none border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
      )}
    />
  )
}
