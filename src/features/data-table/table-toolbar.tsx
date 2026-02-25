import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ToolbarConfig } from "@/types/config"
import { Search, X } from "lucide-react"
import { useState } from "react"

type TableToolbarProps = {
  config?: ToolbarConfig
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  totalItems: number
  selectedItems: number
}

export function TableToolbar({
  config,
  globalFilter,
  onGlobalFilterChange,
  totalItems,
  selectedItems,
}: TableToolbarProps) {
  const [showSearch, setShowSearch] = useState(false)

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-2">
        {config?.search !== false && (
          <>
            {showSearch ? (
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Search..."
                  value={globalFilter}
                  onChange={(e) => onGlobalFilterChange(e.target.value)}
                  className="h-6 w-48 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setShowSearch(false)
                    onGlobalFilterChange("")
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowSearch(true)}
              >
                <Search />
              </Button>
            )}
          </>
        )}

        {config?.actions?.map((action) => (
          <Button key={action.id} variant={action.variant ?? "ghost"} size="sm">
            {action.label}
          </Button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Total Items: {totalItems}
        {selectedItems > 0 && <> &middot; Selected: {selectedItems}</>}
      </div>
    </div>
  )
}
