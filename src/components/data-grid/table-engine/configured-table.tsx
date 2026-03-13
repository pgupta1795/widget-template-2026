import { DataGrid } from "@/components/data-grid/data-grid"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import type { TableConfig } from "./types"
import { useTableEngine } from "./use-table-engine"

export interface ConfiguredTableProps {
  config: TableConfig
  className?: string
}

/**
 * Declarative table component. Pass a TableConfig and get a fully-featured DataGrid.
 *
 * Handles:
 * - Multi-source API fetching with DAG-based dependency resolution
 * - JSONata data transforms and derived column values
 * - Per-column visibility, sorting, filtering, editing, resizing, and ordering control
 * - Flat, Paginated, Infinite, and Tree modes
 *
 * @example
 * <ConfiguredTable config={bomTableConfig} />
 */
export function ConfiguredTable({ config, className }: ConfiguredTableProps) {
  const {
    data,
    columns,
    initialColumnVisibility,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
  } = useTableEngine<GridRow>(config)

  if (isError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Failed to load table</AlertTitle>
        <AlertDescription>
          {error?.message ?? "An unexpected error occurred."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <DataGrid
      data={data}
      columns={columns}
      mode={config.mode}
      features={config.features ?? {}}
      isLoading={isLoading}
      initialColumnVisibility={initialColumnVisibility}
      getSubRows={
        config.options?.subRowsField
          ? (row) =>
              (row as Record<string, unknown>)[
                config.options!.subRowsField!
              ] as GridRow[] | undefined
          : undefined
      }
      isFetchingNextPage={isFetchingNextPage}
      className={className}
    />
  )
}
