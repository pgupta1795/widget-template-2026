import { useState, useCallback } from "react"
import type { EditingFeatureConfig } from "@/components/data-grid/types/grid-types"

export interface ActiveEdit {
  rowId: string
  columnId: string
  originalValue: unknown
}

export interface UseEditingResult {
  activeEdit: ActiveEdit | null
  startEditing: (rowId: string, columnId: string, value: unknown) => void
  cancelEditing: () => void
  commitEditing: (value: unknown) => Promise<void>
  mutatingRowIds: Set<string>
  errorRowIds: Set<string>
}

export function useEditing(config?: EditingFeatureConfig): UseEditingResult {
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null)
  const [mutatingRowIds, setMutatingRowIds] = useState(
    () => new Set<string>(),
  )
  const [errorRowIds, setErrorRowIds] = useState(() => new Set<string>())

  const startEditing = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (!config?.enabled) return
      setActiveEdit({ rowId, columnId, originalValue: value })
    },
    [config?.enabled],
  )

  const cancelEditing = useCallback(() => {
    setActiveEdit(null)
  }, [])

  const commitEditing = useCallback(
    async (value: unknown) => {
      if (!activeEdit) return
      const { rowId, columnId, originalValue } = activeEdit
      setActiveEdit(null)

      if (value === originalValue || !config?.onMutate) return

      setMutatingRowIds((prev) => new Set([...prev, rowId]))
      try {
        await config.onMutate(rowId, columnId, value)
      } catch (err) {
        config.onError?.(err)
        setErrorRowIds((prev) => new Set([...prev, rowId]))
        setTimeout(() => {
          setErrorRowIds((prev) => {
            const next = new Set(prev)
            next.delete(rowId)
            return next
          })
        }, 600)
      } finally {
        setMutatingRowIds((prev) => {
          const next = new Set(prev)
          next.delete(rowId)
          return next
        })
      }
    },
    [activeEdit, config],
  )

  return {
    activeEdit,
    startEditing,
    cancelEditing,
    commitEditing,
    mutatingRowIds,
    errorRowIds,
  }
}
