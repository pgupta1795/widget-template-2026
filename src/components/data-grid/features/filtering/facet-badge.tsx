import { ListFilter } from "lucide-react"

interface FacetBadgeProps {
  count?: number
}

export function FacetBadge({ count }: FacetBadgeProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <ListFilter className="h-3.5 w-3.5 text-primary" />
      {count !== undefined && count > 0 && (
        <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1 leading-tight font-medium">
          {count}
        </span>
      )}
    </span>
  )
}
