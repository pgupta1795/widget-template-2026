import { Database } from 'lucide-react'

interface DataGridEmptyProps {
  hasActiveFilters?: boolean
  slots?: {
    empty?: React.ReactNode
  }
}

export function DataGridEmpty({ hasActiveFilters, slots }: DataGridEmptyProps) {
  if (slots?.empty) {
    return <>{slots.empty}</>
  }

  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2 w-full">
      <Database size={32} className="text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">No data</p>
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
      )}
    </div>
  )
}
