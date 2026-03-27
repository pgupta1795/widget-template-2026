# Form Engine — Phase 1: Type System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the DAG type system with form node types and create all form-engine TypeScript interfaces.

**Architecture:** Two core files are extended (`dag.types.ts`, `table.types.ts`) to add form node discriminants. A new `form.types.ts` file in `form-engine/types/` holds all form-specific config and output types. `DAGFormConfig` mirrors `DAGTableConfig` exactly but uses a `formId` and adds `acceptedTypes`. No behaviour change — pure type additions.

**Tech Stack:** TypeScript 5, Biome (linting/formatting)

**Spec:** `docs/superpowers/specs/2026-03-24-form-engine-design.md`

**Next phase:** `docs/superpowers/plans/2026-03-24-form-engine-phase-2-fields.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/types/dag.types.ts` | Modify — extend `NodeType`, `NodeConfigMap`, `DAGNode` union |
| `src/components/data-grid/table-engine/types/table.types.ts` | Modify — extend `NodeOutputMap` |
| `src/components/form-engine/types/form.types.ts` | Create — all form config/output/DAGFormConfig types |
| `src/components/form-engine/index.ts` | Create — public barrel (types only for now) |

---

## Task 1: Extend `NodeType` in `dag.types.ts`

**File:** `src/components/data-grid/table-engine/types/dag.types.ts`

- [ ] Open `dag.types.ts`. The current `NodeType` union (line ~29) ends with `"columnHydrate"`. Add four form variants:

```ts
export type NodeType =
  | "api"
  | "transform"
  | "column"
  | "rowExpand"
  | "merge"
  | "action"
  | "rowEnrich"
  | "columnHydrate"
  | "headerForm"
  | "detailPanel"
  | "formSection"
  | "formField";
```

- [ ] Add the four new config type imports at the top of `dag.types.ts`. The existing import from `"./table.types"` must be extended:

```ts
import type {
  ActionNodeConfig,
  ApiNodeConfig,
  ColumnHydrateNodeConfig,
  ColumnNodeConfig,
  MergeNodeConfig,
  NodeOutputMap,
  RowEnrichNodeConfig,
  RowExpandNodeConfig,
  TransformNodeConfig,
} from "./table.types";
import type {
  DetailPanelNodeConfig,
  FormFieldNodeConfig,
  FormSectionNodeConfig,
  HeaderFormNodeConfig,
} from "../../form-engine/types/form.types";
```

- [ ] Extend `NodeConfigMap` with the four form entries:

```ts
export interface NodeConfigMap {
  api: ApiNodeConfig;
  transform: TransformNodeConfig;
  column: ColumnNodeConfig;
  rowExpand: RowExpandNodeConfig;
  merge: MergeNodeConfig;
  action: ActionNodeConfig;
  rowEnrich: RowEnrichNodeConfig;
  columnHydrate: ColumnHydrateNodeConfig;
  headerForm: HeaderFormNodeConfig;
  detailPanel: DetailPanelNodeConfig;
  formSection: FormSectionNodeConfig;
  formField: FormFieldNodeConfig;
}
```

- [ ] Extend the `DAGNode` discriminated union with four new variants:

```ts
export type DAGNode =
  | { id: string; type: "api"; config: ApiNodeConfig }
  | { id: string; type: "transform"; config: TransformNodeConfig }
  | { id: string; type: "column"; config: ColumnNodeConfig }
  | { id: string; type: "rowExpand"; config: RowExpandNodeConfig }
  | { id: string; type: "merge"; config: MergeNodeConfig }
  | { id: string; type: "action"; config: ActionNodeConfig }
  | { id: string; type: "rowEnrich"; config: RowEnrichNodeConfig }
  | { id: string; type: "columnHydrate"; config: ColumnHydrateNodeConfig }
  | { id: string; type: "headerForm"; config: HeaderFormNodeConfig }
  | { id: string; type: "detailPanel"; config: DetailPanelNodeConfig }
  | { id: string; type: "formSection"; config: FormSectionNodeConfig }
  | { id: string; type: "formField"; config: FormFieldNodeConfig };
```

- [ ] Run `npm run check` — expect TS errors only about missing `form.types.ts` (which we create next).

---

## Task 2: Create `src/components/form-engine/types/form.types.ts`

- [ ] Create the directory `src/components/form-engine/types/` and write the file:

```ts
// src/components/form-engine/types/form.types.ts
import type { DAGConfig, JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

// ── Field Types ───────────────────────────────────────────────────────────────

export type FormFieldType =
  | "text"
  | "date"
  | "badge"
  | "link"
  | "dropdown"
  | "number"
  | "boolean"
  | "image"
  | "richtext"
  | "keyvalue";

export type FormSectionLayout = "horizontal" | "vertical" | "grid";

// ── FormField Node ────────────────────────────────────────────────────────────

export interface FormFieldNodeConfig {
  fieldType: FormFieldType;
  label: string;
  /** Field name from the API response to read the value from */
  sourceField: string;
  editable?: boolean;
  /** ID of a DAG api node that returns options for dropdown/badge edit */
  optionsApiNodeId?: string;
  /** Color map for badge field type: { [value]: colorToken } */
  badgeColorMap?: Record<string, string>;
  /** For link fields: the URL template (supports $: JSONata) */
  linkUrl?: string;
}

export interface FormFieldNodeOutput {
  fieldId: string;
  config: FormFieldNodeConfig;
}

// ── FormSection Node ──────────────────────────────────────────────────────────

export interface FormSectionNodeConfig {
  label: string;
  layout: FormSectionLayout;
  /** Number of columns for grid layout; ignored for horizontal/vertical */
  columns?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** IDs of formField nodes belonging to this section */
  fieldIds: string[];
}

export interface FormSectionNodeOutput {
  sectionId: string;
  config: FormSectionNodeConfig;
  fields: FormFieldNodeOutput[];
}

// ── HeaderForm Node ───────────────────────────────────────────────────────────

export interface HeaderFormNodeConfig {
  /** ID of the DAG api node that provides header data */
  sourceNodeId: string;
  imageField?: string;
  titleField: string;
  nameField?: string;
  badgeField?: string;
  badgeColorMap?: Record<string, string>;
  /** Fields shown only in expanded mode (as label: value pairs) */
  expandedFields?: string[];
  /** Fields always shown as compact key-value pairs in expanded mode */
  keyValueFields?: string[];
  /** When true, the ℹ icon fires onToggleDetail callback */
  infoIconTogglesDetailPanel?: boolean;
}

export interface HeaderFormNodeOutput {
  config: HeaderFormNodeConfig;
}

// ── DetailPanel Node ──────────────────────────────────────────────────────────

export interface DetailPanelToolbarConfig {
  showSave?: boolean;
  showClose?: boolean;
  showEdit?: boolean;
}

export interface DetailPanelNodeConfig {
  /** ID of the DAG api node that provides form data */
  sourceNodeId: string;
  /** ID of the DAG api node to call on save (PATCH/POST) */
  saveApiNodeId?: string;
  /** Field name used as the row identifier */
  rowKeyField: string;
  /** IDs of formSection nodes to render in order */
  sections: string[];
  toolbar?: DetailPanelToolbarConfig;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
}

export interface DetailPanelNodeOutput {
  config: DetailPanelNodeConfig;
  sections: FormSectionNodeOutput[];
}

// ── DAGFormConfig ─────────────────────────────────────────────────────────────

export interface DAGFormConfig {
  formId: string;
  /** Object types this form accepts via drag-and-drop */
  acceptedTypes: string[];
  /** The param name to inject the dropped object's ID as ($params.<dropParamName>) */
  dropParamName?: string;
  dag: DAGConfig;
}

// ── Runtime Form State ────────────────────────────────────────────────────────

export interface FormFieldData {
  fieldId: string;
  label: string;
  fieldType: FormFieldType;
  value: JsonPrimitive;
  editable: boolean;
  options?: Array<{ label: string; value: JsonPrimitive }>;
  badgeColorMap?: Record<string, string>;
  linkUrl?: string;
}

export interface FormSectionData {
  sectionId: string;
  label: string;
  layout: FormSectionLayout;
  columns?: number;
  collapsible: boolean;
  defaultCollapsed: boolean;
  fields: FormFieldData[];
}

export interface HeaderFormData {
  image?: string;
  title: string;
  name?: string;
  badge?: string;
  badgeColor?: string;
  expandedFields: Array<{ label: string; value: string }>;
  keyValueFields: Array<{ label: string; value: string }>;
}
```

- [ ] Run `npm run check` — expect zero TS errors.

---

## Task 3: Extend `NodeOutputMap` in `table.types.ts`

**File:** `src/components/data-grid/table-engine/types/table.types.ts`

- [ ] Add import for form output types at the top of `table.types.ts`:

```ts
import type {
  DetailPanelNodeOutput,
  FormFieldNodeOutput,
  FormSectionNodeOutput,
  HeaderFormNodeOutput,
} from "../../form-engine/types/form.types";
```

- [ ] Find `NodeOutputMap` in the file and add the four form output entries:

```ts
export interface NodeOutputMap {
  // ... existing entries ...
  headerForm: HeaderFormNodeOutput;
  detailPanel: DetailPanelNodeOutput;
  formSection: FormSectionNodeOutput;
  formField: FormFieldNodeOutput;
}
```

- [ ] Run `npm run check` — expect zero TS errors.

---

## Task 4: Create `src/components/form-engine/index.ts` (types barrel only)

- [ ] Create `src/components/form-engine/index.ts`:

```ts
// src/components/form-engine/index.ts
// Public API — expanded in later phases
export type {
  DAGFormConfig,
  DetailPanelNodeConfig,
  FormFieldNodeConfig,
  FormFieldType,
  FormSectionNodeConfig,
  HeaderFormNodeConfig,
  FormFieldData,
  FormSectionData,
  HeaderFormData,
} from "./types/form.types";
```

- [ ] Run `npm run check` — expect zero TS errors.

---

## Task 5: Verify and commit

- [ ] Run `npm run build` — must succeed with zero errors.

- [ ] Commit:

```bash
git add src/components/data-grid/table-engine/types/dag.types.ts \
        src/components/data-grid/table-engine/types/table.types.ts \
        src/components/form-engine/types/form.types.ts \
        src/components/form-engine/index.ts
git commit -m "feat(form-engine): add form node types to DAG type system (phase 1)"
```
