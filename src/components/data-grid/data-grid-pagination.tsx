import { ChevronLeft, ChevronRight } from "lucide-react"
import { useDataGridContext } from "./data-grid-context"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)

  const pages: (number | "...")[] = []

  if (currentPage <= 3) {
    pages.push(0, 1, 2, 3, "...", totalPages - 1)
  } else if (currentPage >= totalPages - 4) {
    pages.push(
      0,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
    )
  } else {
    pages.push(
      0,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages - 1,
    )
  }

  return pages
}

export function DataGridPagination() {
  const { table, paginatedTotal } = useDataGridContext()
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-background"
    >
      {/* Count text */}
      <div className="text-xs text-muted-foreground">
        {paginatedTotal != null
          ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, paginatedTotal)} of ${paginatedTotal}`
          : `Page ${pageIndex + 1}`}
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers(pageIndex, pageCount).map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === pageIndex ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => table.setPageIndex(page as number)}
              aria-current={page === pageIndex ? "page" : undefined}
            >
              {(page as number) + 1}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Rows per page */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => table.setPageSize(Number(v))}
        >
          <SelectTrigger className="h-7 w-16 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  )
}
