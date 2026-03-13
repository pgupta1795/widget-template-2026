import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EditorProps } from "@/components/data-grid/types/editor-types"
import { X } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"

export function ChipEditor({
  value,
  onChange,
  onSave,
  onCancel,
}: EditorProps<string[]>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [chips, setChips] = useState<string[]>(
    Array.isArray(value) ? [...(value as string[])] : []
  )
  const [inputVal, setInputVal] = useState("")

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Save on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onChange(chips)
        onSave()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [chips, onChange, onSave])

  const addChip = (text: string) => {
    const trimmed = text.trim()
    if (trimmed && !chips.includes(trimmed)) {
      setChips((prev) => [...prev, trimmed])
    }
    setInputVal("")
  }

  const removeChip = (index: number) => {
    setChips((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (inputVal.trim()) {
        const next = [...chips]
        const trimmed = inputVal.trim()
        if (trimmed && !next.includes(trimmed)) next.push(trimmed)
        setChips(next)
        setInputVal("")
      } else {
        onChange(chips)
        onSave()
      }
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
    if (e.key === "Backspace" && inputVal === "" && chips.length > 0) {
      setChips((prev) => prev.slice(0, -1))
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-full flex-wrap items-center gap-1",
        "px-(--cell-px) py-1",
        "ring-2 ring-primary/60 ring-inset",
        "cursor-text bg-background"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {chips.map((chip, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs"
        >
          {chip}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              removeChip(i)
            }}
            className="ml-0.5 h-auto w-auto p-0 hover:text-destructive"
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputVal.trim()) addChip(inputVal)
        }}
        className="h-auto min-w-16 flex-1 border-0 bg-transparent p-0 text-(length:--font-size) shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0"
        placeholder={chips.length === 0 ? "Add tags…" : ""}
      />
    </div>
  )
}
