import { DataGrid } from '@/components/data-grid/data-grid'
import { mergeToolbarCommands } from '@/components/data-grid/toolbar/merge-toolbar-commands'
import type { ToolbarCommand } from '@/components/data-grid/toolbar/toolbar.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useCallback, useMemo, useState } from 'react'
import { createDefaultEngine } from './bootstrap'
import { useDAGTable } from './hooks/use-dag-table'
import type { JsonPrimitive } from './types/dag.types'
import type { ActionDef, DAGTableConfig } from './types/table.types'

export interface ConfiguredTableProps {
  config: DAGTableConfig
  className?: string
  params?: Record<string, JsonPrimitive>
  /**
   * Extends or overrides DAG-generated toolbar commands.
   * Matching id: consumer command fully replaces the DAG command.
   * New id: appended after DAG commands.
   */
  toolbarCommands?: ToolbarCommand[]
  /** CSS classes for the toolbar bar element */
  toolbarClassName?: string
}

/**
 * Converts a DAG ActionDef to a ToolbarCommand.
 * Icon is a string in DAG config — resolved to a Lucide component at render time.
 */
function actionDefToToolbarCommand(
  action: ActionDef,
  onAction: (actionId: string) => Promise<void>,
): ToolbarCommand {
  return {
    id: action.id,
    type: 'command',
    enabled: true,
    label: action.label,
    // String icon — resolveLucideIcon handles the lookup at render time in ToolbarRenderer.
    // We store the string here (JSON-serializable, works with DAG config).
    icon: action.icon,
    handler: async () => onAction(action.id),
  }
}

/**
 * Declarative table component. Pass a DAGTableConfig and get a fully-featured DataGrid.
 *
 * Handles:
 * - DAG-based API fetching with topological wave execution
 * - JSONata data transforms and per-cell derived values
 * - Flat, Paginated, Infinite, and Tree modes
 * - Lazy row expansion via RowExpandNode
 * - Row/toolbar/cell actions via ActionNode
 * - Toolbar customization via toolbarCommands prop
 */
export function ConfiguredTable({
  config,
  className,
  params,
  toolbarCommands: consumerToolbarCommands,
  toolbarClassName,
}: ConfiguredTableProps) {
  // One engine instance per table mount
  const engine = useMemo(() => createDefaultEngine(), [])

  // Server-side search state — keyed by queryParamName for multi-search support
  const [searchParams, setSearchParams] = useState<Record<string, string>>({})

  const handleSearch = useCallback((paramName: string, query: string) => {
    setSearchParams((prev) => {
      if (!query) {
        const next = { ...prev }
        delete next[paramName]
        return next
      }
      return { ...prev, [paramName]: query }
    })
  }, [])

  const {
    data,
    columns,
    columnVisibility,
    isLoading,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    onExpand,
    onAction,
  } = useDAGTable(
    config,
    engine,
    // searchParams merged into params so React Query key includes them → triggers refetch
    { ...params, ...searchParams },
  )

  // Convert DAG toolbarActions → ToolbarCommand[]
  // onAction is stable (useCallback in useDAGTable), so this memo re-runs only on config change
  const dagToolbarCommands = useMemo<ToolbarCommand[]>(() => {
    const actionNode = config.dag.nodes.find((n) => n.type === 'action')
    if (!actionNode || actionNode.type !== 'action') return []
    const toolbarActions: ActionDef[] = actionNode.config.toolbarActions ?? []
    return toolbarActions.map((action) =>
      actionDefToToolbarCommand(action, (id) =>
        onAction ? onAction(id) : Promise.resolve(),
      ),
    )
  }, [config.dag.nodes, onAction])

  // Merge DAG commands with consumer overrides (consumer wins on matching id)
  const mergedToolbarCommands = useMemo(
    () => mergeToolbarCommands(dagToolbarCommands, consumerToolbarCommands),
    [dagToolbarCommands, consumerToolbarCommands],
  )

  // Strip engine-only feature fields before passing to DataGrid
  const {
    columnOrdering: _co,
    columnResizing: _cr,
    columnVisibility: _cv,
    ...gridFeatures
  } = config.features ?? {}

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Failed to load table</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  // For infinite mode: DataGrid's infinite query setup conflicts with useDAGTable's.
  // Pass data as flat mode but include fetchNextPage/hasNextPage for load-more support.
  const gridMode =
    config.mode === 'infinite' ? ('flat' as const) : config.mode

  return (
    <DataGrid
      data={data}
      columns={columns}
      mode={gridMode}
      features={gridFeatures}
      density={config.density}
      isLoading={isLoading}
      initialColumnVisibility={columnVisibility}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      onExpand={onExpand}
      className={className}
      // Toolbar wiring
      // Pass undefined only when neither the DAG nor the consumer supplied any commands.
      // If consumer explicitly passes toolbarCommands={[]} we preserve the empty array
      // (empty toolbar bar rendered, not hidden) by checking consumerToolbarCommands !== undefined.
      toolbarCommands={
        consumerToolbarCommands !== undefined || mergedToolbarCommands.length > 0
          ? mergedToolbarCommands
          : undefined
      }
      toolbarClassName={toolbarClassName}
      onAction={onAction}
      onSearch={handleSearch}
    />
  )
}
