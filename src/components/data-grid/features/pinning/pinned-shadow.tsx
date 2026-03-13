import type { Column } from "@tanstack/react-table"
import type { GridRow } from "@/components/data-grid/types/grid-types"

const LEFT_SHADOW =
  "shadow-[inset_-1px_0_0_hsl(var(--border)),_4px_0_8px_-2px_oklch(0_0_0/0.06)]"
const RIGHT_SHADOW =
  "shadow-[inset_1px_0_0_hsl(var(--border)),_-4px_0_8px_-2px_oklch(0_0_0/0.06)]"

/**
 * Returns the appropriate shadow class for the edge of a pinned column group:
 * - Last left-pinned column gets a right-side shadow
 * - First right-pinned column gets a left-side shadow
 */
export function getPinnedShadowClass(
  column: Column<GridRow, unknown>,
  leftCols: Column<GridRow, unknown>[],
  rightCols: Column<GridRow, unknown>[],
): string {
  const pinned = column.getIsPinned()
  if (!pinned) return ""

  if (pinned === "left" && leftCols.at(-1)?.id === column.id) {
    return LEFT_SHADOW
  }
  if (pinned === "right" && rightCols[0]?.id === column.id) {
    return RIGHT_SHADOW
  }
  return ""
}
