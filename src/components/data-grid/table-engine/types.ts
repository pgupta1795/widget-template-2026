import type { GridRow, GridFeaturesConfig, GridMode } from "@/components/data-grid/types/grid-types"
import type { ColumnType, ColumnMeta, GridColumnDef } from "@/components/data-grid/types/column-types"

// ─── Error ────────────────────────────────────────────────────────────────────

/**
 * Thrown when a TableConfig is structurally invalid (cycles, unknown refs, etc.)
 * Caught at hook-mount time before any fetch is made.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

// ─── Data Source ──────────────────────────────────────────────────────────────

/**
 * Describes one API call in the data dependency graph.
 * `dependsOn` drives the DAG — sources with no deps run first (Wave 0),
 * sources that depend on others run in the next available wave.
 */
export interface DataSourceConfig {
  /** Unique identifier used to reference this source in other configs and JSONata via $sources.<id> */
  id: string
  /**
   * The endpoint URL. May be a plain string or a JSONata expression.
   * In JSONata context: $sources.<id> references resolved prior source data.
   * Example: '"/api/suppliers?ids=" & $join($distinct($sources.bom.supplierId), ",")'
   */
  url: string
  /** HTTP method. Defaults to "GET". */
  method?: "GET" | "POST"
  /** Static headers merged with any global headers. */
  headers?: Record<string, string>
  /**
   * Query params. Each value may be a plain string or a JSONata expression
   * evaluated with $sources context.
   */
  params?: Record<string, string>
  /**
   * Request body for POST requests. May reference $sources via JSONata expressions
   * embedded in string values.
   */
  body?: Record<string, unknown>
  /**
   * IDs of other DataSourceConfig entries this source depends on.
   * The DAG resolver guarantees those sources are resolved first.
   * Circular dependencies throw ConfigError at hook-mount time.
   */
  dependsOn?: string[]
  /**
   * JSONata expression applied to the raw API response to produce the final data.
   * Example: "$.items" extracts the items array from { items: [...] }.
   * If omitted, the raw response is used as-is.
   */
  transform?: string
  /**
   * If true, this source is called once per unique cacheKey value across all rows
   * rather than as a single bulk call. Used for column enrichment (FK lookups).
   */
  rowLevel?: boolean
  /**
   * JSONata expression evaluated on each row to produce a string cache key.
   * Rows with the same cacheKey share one fetch call (deduplication).
   * Required when rowLevel is true.
   * Example: "$string(supplierId)"
   */
  cacheKey?: string
  /** Whether to retry once on network error. Defaults to true. 4xx/5xx are NOT retried. */
  retryOnNetworkError?: boolean
}

// ─── Depth Rule ───────────────────────────────────────────────────────────────

/**
 * Controls editability at specific tree depths.
 * Depth 0 = root rows, depth 1 = their children, etc.
 *
 * @example
 * // Editable only at depth 1 and 2
 * { depths: [1, 2] }
 *
 * // Editable from depth 1 downward (leaf rows only when root is not editable)
 * { minDepth: 1 }
 *
 * // Editable only at root level
 * { maxDepth: 0 }
 */
export type DepthRule =
  | { depths: number[] }
  | { minDepth: number }
  | { maxDepth: number }

// ─── Column Config ────────────────────────────────────────────────────────────

/**
 * Declarative column definition. The column builder maps this to a GridColumnDef
 * using the appropriate existing column factory.
 */
export interface ColumnConfig {
  /** Maps to accessorKey on the produced GridColumnDef. */
  field: string
  /** Column header label. */
  header: string

  // Type — drives factory selection in column-builder
  /** Column data type. Drives which existing factory is used. Defaults to "string". */
  type?: ColumnType

  // Visibility & layout
  /** Whether the column is visible on mount. Defaults to true. */
  visible?: boolean
  /** Initial width in pixels. */
  width?: number
  /** Minimum width in pixels. */
  minWidth?: number
  /** Maximum width in pixels. */
  maxWidth?: number
  /** Pin the column to the left or right. */
  pinned?: "left" | "right" | false

  // Per-column feature toggles
  /** Allow sorting by this column. Defaults to global features.sorting.enabled. */
  sortable?: boolean
  /** Show filter UI for this column. Defaults to global features.filtering.enabled. */
  filterable?: boolean
  /** Allow column to be resized by dragging. Defaults to global features.columnResizing.enabled. */
  resizable?: boolean
  /**
   * Allow this column to be reordered via drag-and-drop.
   * When false, the drag handle is hidden and the column stays in place.
   * Defaults to true.
   */
  orderable?: boolean
  /** Show copy-to-clipboard button on hover. */
  copyable?: boolean

  /**
   * Editability control.
   * - boolean: editable everywhere or nowhere.
   * - DepthRule: editable only at specific tree depths (tree mode only).
   */
  editable?: boolean | DepthRule

  // Secondary source binding
  /** ID of a DataSourceConfig that provides the value for this column. */
  dataSource?: string
  /**
   * When dataSource is set, defines how to join the secondary source
   * data to the primary row.
   */
  joinOn?: {
    /** Field on the primary row used as the FK (e.g. "supplierId"). */
    rowField: string
    /**
     * Field on the source record to match against rowField value (the PK / join key).
     * Example: "id" — find the source record where record.id === row.supplierId.
     */
    sourceKey: string
    /**
     * Field on the matched source record to use as this column's cell value.
     * Example: "name" — display supplier.name after joining on supplier.id.
     */
    sourceField: string
  }

  /**
   * JSONata expression to compute a derived value from the current row.
   * Context: $row = the current row object.
   * Evaluated during data resolution phase; result stored on row[field] before
   * TanStack Table renders — so accessorKey reads a plain pre-computed value.
   * Example: "$row.quantity * $row.unitPrice"
   */
  valueExpr?: string

  /** Direct pass-through to ColumnMeta on the produced GridColumnDef. */
  meta?: Partial<ColumnMeta>
}

// ─── Table Features ───────────────────────────────────────────────────────────

/**
 * Superset of GridFeaturesConfig. The three new fields are engine-only:
 * they are consumed by column-builder.ts and stripped before being passed
 * to DataGrid (which only accepts GridFeaturesConfig).
 */
export interface TableFeaturesConfig extends GridFeaturesConfig {
  /** Enable/disable global drag-and-drop column reordering. */
  columnOrdering?: { enabled?: boolean }
  /** Enable/disable global column resize handles. */
  columnResizing?: { enabled?: boolean }
  /** Enable/disable the show/hide columns UI in the toolbar. */
  columnVisibility?: { enabled?: boolean }
}

// ─── Table Config ─────────────────────────────────────────────────────────────

/**
 * The top-level config object a developer writes to declare a table.
 * Pass to <ConfiguredTable config={myConfig} /> or useTableEngine(myConfig).
 */
export interface TableConfig {
  /** Unique identifier for this table. Used as the base React Query key. */
  id: string
  /** Grid rendering mode. */
  mode: GridMode
  /**
   * All API data sources for this table. Evaluated in DAG order.
   * The first non-rowLevel source without dependsOn provides the primary rows.
   */
  dataSources: DataSourceConfig[]
  /** Column definitions. Mapped to GridColumnDef[] by column-builder. */
  columns: ColumnConfig[]
  /** Feature flags. Engine-only keys (columnOrdering/Resizing/Visibility) are stripped before passing to DataGrid. */
  features?: TableFeaturesConfig
  options?: {
    /** Initial page size for paginated mode. Defaults to 50. */
    pageSize?: number
    /** Row height override passed to virtualization. */
    rowHeight?: number
    /**
     * Field name on row objects that contains the children array (tree mode).
     * Plain string — not a JSONata expression.
     * Example: "children"
     */
    subRowsField?: string
  }
}

// ─── Extended Column Meta ─────────────────────────────────────────────────────

/**
 * Engine-internal extension of ColumnMeta.
 * Carries the runtime editability resolver for DepthRule columns.
 * ColumnMeta already has [key: string]: unknown so this is type-safe as a cast.
 */
export interface TableColumnMeta extends ColumnMeta {
  /**
   * When editable is a DepthRule, column-builder stores the resolver here
   * and sets meta.editable = false. Checked at render time using row.depth.
   */
  editableFn?: (row: GridRow, depth: number) => boolean
  /**
   * When orderable: false, column-builder stores false here.
   * DataGridHeader reads this to suppress the drag handle affordance.
   */
  orderable?: boolean
}

// ─── Engine Result ────────────────────────────────────────────────────────────

/**
 * Return type of useTableEngine. Ready to be spread onto DataGrid props.
 */
export interface TableEngineResult<TData extends GridRow> {
  /** Resolved, merged, derived-value-enriched rows. */
  data: TData[]
  /** Built column defs using existing column factories. */
  columns: GridColumnDef<TData>[]
  /** Initial visibility state — columns with visible:false appear here as { field: false }. */
  initialColumnVisibility: Record<string, boolean>
  /** True while any primary source fetch is in-flight. */
  isLoading: boolean
  /** True if the primary DAG fetch threw an error. */
  isError: boolean
  /** The error from the primary DAG fetch, if any. */
  error: Error | null
  /** Trigger a full refetch of all sources. */
  refetch: () => void
  /** Errors from row-level source fetches (partial — other columns still render). */
  rowSourceErrors: Array<{ sourceId: string; cacheKey: string; error: Error }>
  // Infinite mode props (undefined in other modes)
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  // Paginated / total count
  total?: number
}

// ─── Column Build Result ──────────────────────────────────────────────────────

/** Internal return type of buildColumns() in column-builder.ts. */
export interface ColumnBuildResult<TData extends GridRow> {
  columns: GridColumnDef<TData>[]
  initialColumnVisibility: Record<string, boolean>
}

// ─── Source Map ───────────────────────────────────────────────────────────────

/** Map produced by the DAG resolver: sourceId → transformed response data. */
export type SourceMap = Record<string, unknown>
