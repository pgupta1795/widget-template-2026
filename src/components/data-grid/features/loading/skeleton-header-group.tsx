interface SkeletonHeaderGroupProps {
  colSpan: number
}

export function SkeletonHeaderGroup({ colSpan }: SkeletonHeaderGroupProps) {
  return (
    <th
      colSpan={colSpan}
      className="px-3 py-2 border-r border-border/30 bg-muted/40"
    >
      <div className="h-4 w-3/5 rounded-sm bg-muted/60 animate-pulse motion-reduce:animate-none mx-auto" />
    </th>
  )
}
