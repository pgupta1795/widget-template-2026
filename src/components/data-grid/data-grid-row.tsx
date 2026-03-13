import React from "react"
import type { Row } from "@tanstack/react-table"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import { DataGridCell } from "./data-grid-cell"
import { GroupRow } from "@/components/data-grid/features/grouping/group-row"
import { useDataGridContext } from "./data-grid-context"
import { cn } from "@/lib/utils"
import { TableRow as ShadcnTableRow, TableCell } from "@/components/ui/table"

interface DataGridRowProps {
  row: Row<GridRow>
  pinned?: "top" | "bottom"
  className?: string
  initialIndex?: number
}

export function DataGridRow({
  row,
  pinned,
  className,
  initialIndex,
}: DataGridRowProps) {
  const { mode, features, table, columnVirtualizer, mutatingRowIds, errorRowIds } =
    useDataGridContext()

    // Render group rows differently
    if (row.getIsGrouped()) {
      return <GroupRow row={row} />
    }

    const isTreeMode = mode === "tree"
    const isColVirtualized = features?.virtualization?.enabled ?? false
    const isMutating = mutatingRowIds.has(row.id)
    const isError = errorRowIds.has(row.id)

    // Tree depth tinting — subtle left border per depth level
    const depthStyle: React.CSSProperties =
      isTreeMode && row.depth > 0
        ? {
            borderLeft: `2px solid`,
            borderLeftColor: `hsl(var(--primary) / ${Math.min(row.depth * 0.12 + 0.08, 0.55)})`,
          }
        : {}

    const pinnedStyle: React.CSSProperties | undefined = pinned
      ? {
          position: "sticky",
          top: pinned === "top" ? "var(--header-height)" : undefined,
          bottom: pinned === "bottom" ? 0 : undefined,
          zIndex: 2,
        }
      : undefined

    const rowStyle: React.CSSProperties = {
      ...depthStyle,
      ...pinnedStyle,
      ...(initialIndex !== undefined && initialIndex < 20
        ? { animationDelay: `${initialIndex * 20}ms` }
        : {}),
    }

    const rowRevealClass =
      initialIndex !== undefined && initialIndex < 20 ? "row-reveal" : undefined

    // With column virtualization, split cells into pinned + center
    if (isColVirtualized) {
      const leftCells = row.getLeftVisibleCells()
      const centerCells = row.getCenterVisibleCells()
      const rightCells = row.getRightVisibleCells()

      const virtualCols = columnVirtualizer.getVirtualItems()
      const totalColSize = columnVirtualizer.getTotalSize()
      const centerCols = table.getCenterLeafColumns()

      const startPad =
        virtualCols.length > 0 && centerCols.length > 0
          ? centerCols
              .slice(0, virtualCols[0]?.index ?? 0)
              .reduce((s, c) => s + c.getSize(), 0)
          : 0
      const endPad =
        virtualCols.length > 0 && centerCols.length > 0
          ? totalColSize -
            (virtualCols[virtualCols.length - 1]
              ? centerCols
                  .slice(0, (virtualCols[virtualCols.length - 1]?.index ?? 0) + 1)
                  .reduce((s, c) => s + c.getSize(), 0)
              : 0)
          : 0

      const virtualCenterCellIds = new Set(
        virtualCols.map((vc) => centerCols[vc.index]?.id).filter(Boolean),
      )
      const visibleCenterCells = centerCells.filter((cell) =>
        virtualCenterCellIds.has(cell.column.id),
      )

      return (
        <ShadcnTableRow
          className={cn(
            "group/row bg-background hover:bg-muted/30",
            "data-[selected=true]:bg-primary/6 data-[selected=true]:border-l-2 data-[selected=true]:border-l-primary",
            "transition-colors duration-100",
            pinned && "bg-muted/60 shadow-sm",
            isMutating && "opacity-70 pointer-events-none",
            isError && "animate-[flash-error_0.4s_ease]",
            rowRevealClass,
            className,
          )}
          data-selected={String(row.getIsSelected())}
          data-pinned={pinned}
          style={rowStyle}
        >
          {leftCells.map((cell) => (
            <DataGridCell key={cell.id} cell={cell} />
          ))}
          {startPad > 0 && (
            <TableCell style={{ width: startPad, padding: 0 }} />
          )}
          {visibleCenterCells.map((cell) => (
            <DataGridCell key={cell.id} cell={cell} />
          ))}
          {endPad > 0 && (
            <TableCell style={{ width: endPad, padding: 0 }} />
          )}
          {rightCells.map((cell) => (
            <DataGridCell key={cell.id} cell={cell} />
          ))}
        </ShadcnTableRow>
      )
    }

    // Non-virtualized path
    return (
      <ShadcnTableRow
        className={cn(
          "group/row bg-background hover:bg-muted/30",
          "data-[selected=true]:bg-primary/6 data-[selected=true]:border-l-2 data-[selected=true]:border-l-primary",
          "transition-colors duration-100",
          pinned && "bg-muted/60 shadow-sm",
          rowRevealClass,
          className,
        )}
        data-selected={String(row.getIsSelected())}
        data-pinned={pinned}
        style={rowStyle}
      >
        {row.getVisibleCells().map((cell) => (
          <DataGridCell key={cell.id} cell={cell} />
        ))}
      </ShadcnTableRow>
    )
}
