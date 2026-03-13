import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EditorProps } from "@/components/data-grid/types/editor-types"
import React, { useEffect, useRef, useState } from "react"

export function TextEditor({
  value,
  onChange,
  onSave,
  onCancel,
  meta,
}: EditorProps<string>) {
  const ref = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(String(value ?? ""))

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onChange(localValue)
      onSave()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    if (meta?.saveOnBlur !== false) {
      onChange(localValue)
      onSave()
    }
  }

  return (
    <Input
      ref={ref}
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        "h-full w-full px-(--cell-px) py-(--cell-py)",
        "bg-transparent outline-none",
        "text-(length:--font-size)",
        "rounded-none border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
      )}
    />
  )
}
