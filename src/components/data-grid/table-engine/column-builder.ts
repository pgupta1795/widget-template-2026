import { booleanColumn } from "@/components/data-grid/columns/boolean-column"
import { codeColumn } from "@/components/data-grid/columns/code-column"
import { dateColumn } from "@/components/data-grid/columns/date-column"
import { multiValueColumn } from "@/components/data-grid/columns/multi-value-column"
import { numberColumn } from "@/components/data-grid/columns/number-column"
import { selectColumn } from "@/components/data-grid/columns/select-column"
import { stringColumn } from "@/components/data-grid/columns/string-column"
import type { GridColumnDef } from "@/components/data-grid/types/column-types"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import { evaluateDepthRule } from "./jsonata-evaluator"
import {
  ConfigError,
  type ColumnBuildResult,
  type ColumnConfig,
  type DepthRule,
  type SourceMap,
  type TableColumnMeta,
  type TableFeaturesConfig,
} from "./types"

// ─── Factory Registry ─────────────────────────────────────────────────────────
//
// To add a new column type, add an entry here.
// Each factory accepts { accessorKey, header, ...rest } and returns GridColumnDef.

type FactoryOptions = {
  accessorKey: string
  header: string
  editable?: boolean
  copyable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  meta?: Record<string, unknown>
  [key: string]: unknown
}

type ColumnFactory = (options: FactoryOptions) => GridColumnDef

const FACTORY_REGISTRY: Record<string, ColumnFactory> = {
  string: stringColumn as ColumnFactory,
  number: numberColumn as ColumnFactory,
  date: dateColumn as ColumnFactory,
  "multi-value": multiValueColumn as ColumnFactory,
  select: selectColumn as ColumnFactory,
  boolean: booleanColumn as ColumnFactory,
  code: codeColumn as ColumnFactory,
}

function getFactory(type: string | undefined): ColumnFactory {
  return FACTORY_REGISTRY[type ?? "string"] ?? FACTORY_REGISTRY["string"]
}

// ─── Depth Rule Resolver ──────────────────────────────────────────────────────

function buildEditableFn(
  rule: DepthRule
): (row: GridRow, depth: number) => boolean {
  return (_row, depth) => evaluateDepthRule(rule, depth)
}

// ─── Secondary Source Join ────────────────────────────────────────────────────

/**
 * Build an index map from sourceKey value → source record for O(1) joins.
 */
function buildJoinIndex(
  sourceData: unknown,
  sourceKey: string
): Map<unknown, Record<string, unknown>> {
  if (!Array.isArray(sourceData)) return new Map()
  const index = new Map<unknown, Record<string, unknown>>()
  for (const record of sourceData) {
    if (record && typeof record === "object") {
      const key = (record as Record<string, unknown>)[sourceKey]
      index.set(key, record as Record<string, unknown>)
    }
  }
  return index
}

// ─── Main Build Function ──────────────────────────────────────────────────────

/**
 * Convert ColumnConfig[] into GridColumnDef[] using the existing column factories.
 *
 * Extensibility:
 * - Add a new ColumnType: register a factory in FACTORY_REGISTRY above.
 * - Add a new per-column flag: add the mapping in the flag application section below.
 *
 * @param columns  - The ColumnConfig array from TableConfig.
 * @param features - TableFeaturesConfig for reading global enable/disable defaults.
 * @param sourceMap - The resolved SourceMap (from DAG executor) for join columns.
 * @returns columns (GridColumnDef[]) and initialColumnVisibility (hidden columns map).
 */
export function buildColumns<TData extends GridRow>(
  columns: ColumnConfig[],
  features: TableFeaturesConfig | undefined,
  sourceMap: SourceMap
): ColumnBuildResult<TData> {
  const initialColumnVisibility: Record<string, boolean> = {}
  const builtColumns: GridColumnDef<TData>[] = []

  // Global feature defaults (columns inherit these unless overridden per-column)
  const globalSortingEnabled = features?.sorting?.enabled ?? true
  const globalFilteringEnabled = features?.filtering?.enabled ?? true
  const globalResizingEnabled = features?.columnResizing?.enabled ?? true

  for (const colConfig of columns) {
    const {
      field,
      header,
      type,
      visible,
      width,
      minWidth,
      maxWidth,
      sortable,
      filterable,
      resizable,
      orderable,
      editable,
      copyable,
      dataSource,
      joinOn,
      // valueExpr: _valueExpr, // pre-populated by engine onto row[field] — no builder action needed
      meta: extraMeta,
      pinned,
    } = colConfig

    // ── Visibility ──────────────────────────────────────────────────────────
    if (visible === false) {
      initialColumnVisibility[field] = false
    }

    // ── Editable / DepthRule ────────────────────────────────────────────────
    let resolvedEditable = false
    let editableFn: TableColumnMeta["editableFn"] | undefined

    if (typeof editable === "boolean") {
      resolvedEditable = editable
    } else if (editable !== undefined) {
      resolvedEditable = false
      editableFn = buildEditableFn(editable)
    }

    // ── Build meta ──────────────────────────────────────────────────────────
    const meta: TableColumnMeta = {
      ...(extraMeta as Partial<TableColumnMeta>),
      editable: resolvedEditable,
      ...(editableFn ? { editableFn } : {}),
      ...(copyable !== undefined ? { copyable } : {}),
      ...(orderable === false ? { orderable: false } : {}),
      ...(pinned ? { pinned } : {}),
    }

    // ── Select factory and build base column def ────────────────────────────
    const factory = getFactory(type)
    const factoryOptions: FactoryOptions = {
      accessorKey: field,
      header,
      editable: resolvedEditable,
      copyable: copyable ?? false,
      // Pass width/minWidth/maxWidth as the factories expect (they map to size/minSize internally)
      ...(width !== undefined ? { width } : {}),
      ...(minWidth !== undefined ? { minWidth } : {}),
      ...(maxWidth !== undefined ? { maxWidth } : {}),
      meta,
      ...(type === "select" && extraMeta?.options
        ? { options: extraMeta.options }
        : {}),
    }

    let colDef = factory(factoryOptions) as GridColumnDef<TData>

    // ── Apply per-column feature flag overrides ─────────────────────────────
    if (
      sortable === false ||
      (sortable === undefined && !globalSortingEnabled)
    ) {
      colDef = { ...colDef, enableSorting: false }
    } else if (sortable === true) {
      colDef = { ...colDef, enableSorting: true }
    }

    if (
      filterable === false ||
      (filterable === undefined && !globalFilteringEnabled)
    ) {
      colDef = { ...colDef, enableColumnFilter: false }
    } else if (filterable === true) {
      colDef = { ...colDef, enableColumnFilter: true }
    }

    if (
      resizable === false ||
      (resizable === undefined && !globalResizingEnabled)
    ) {
      colDef = { ...colDef, enableResizing: false }
    } else if (resizable === true) {
      colDef = { ...colDef, enableResizing: true }
    }

    // ── Secondary source join (accessorFn) ──────────────────────────────────
    // joinOn.sourceKey = PK field on source record used to build the index
    // joinOn.rowField  = FK field on the primary row for lookup
    // joinOn.sourceField = display field on the matched source record
    if (dataSource && !joinOn) {
      throw new ConfigError(
        `Column "${field}" has dataSource "${dataSource}" but no joinOn config. ` +
          `Provide joinOn: { rowField, sourceKey, sourceField } to define the join.`
      )
    }

    if (dataSource && joinOn) {
      const rawSourceData = sourceMap[dataSource]
      const joinIndex = buildJoinIndex(rawSourceData, joinOn.sourceKey)

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accessorKey: _removed, ...colDefWithoutKey } =
        colDef as typeof colDef & { accessorKey?: string }
      colDef = {
        ...colDefWithoutKey,
        id: field,
        accessorFn: (row: TData) => {
          const fkValue = (row as Record<string, unknown>)[joinOn.rowField]
          const record = joinIndex.get(fkValue)
          return record ? (record[joinOn.sourceField] ?? null) : null
        },
      } as GridColumnDef<TData>
    }

    // ── valueExpr: accessorKey already points to field (engine pre-populates) ─
    // No special handling needed — factory set accessorKey = field.

    builtColumns.push(colDef)
  }

  return { columns: builtColumns, initialColumnVisibility }
}
