import { TableCell } from "@/components/ui/table"

interface SkeletonCellProps {
  width?: string
  height?: string
}

export function SkeletonCell({
  width = "60%",
  height = "13px",
}: SkeletonCellProps) {
  return (
    <TableCell className="border-r border-border/30 px-(--cell-px) py-(--cell-py)">
      <div
        className="animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none"
        style={{ width, height }}
      />
    </TableCell>
  )
}
