# Form Engine Design
_Date: 2026-03-24_

## Overview

A configuration-driven form rendering engine that **extends the existing DAG engine** with new node types. Form configs mirror the shape of `DAGTableConfig` — same registry, same JSONata evaluator, same auth adapters. No duplication.

---

## Goals

- Render a `HeaderForm` (collapsible header strip) and `DetailPanel` (collapsible right-side panel with fields)
- 10 injectable field types: text, date, badge, link, dropdown, number, boolean, image, richtext, keyvalue
- Single save button on the DetailPanel toolbar; toast notifications (sonner) for errors
- Drag-and-drop object context via `acceptedTypes` + `dropParamName`
- Fully config-driven — form configs live alongside table configs in `src/features/[feature]/configs/`
- Layout Engine owns panels and resizing — FormEngine exposes callbacks only

---

## Architecture

### Reuse, Don't Duplicate

The existing DAG engine (`src/components/data-grid/table-engine/core/`) runs unchanged with one required extension. The Form Engine:
1. **Extends `dag.types.ts`** — adds `"headerForm" | "detailPanel" | "formSection" | "formField"` to the `NodeType` union. This is the only change to core types and is additive/non-breaking.
2. Registers new node executors into the existing `node-registry`
3. Adds a `FieldTypeRegistry` for injectable field renderers/editors
4. Provides `ConfiguredForm` (mirrors `ConfiguredTable`) and `useDAGForm` (mirrors `useDAGTable`)

### New DAG Node Types

| Node Type | Purpose |
|---|---|
| `headerForm` | Renders the compact/expanded header strip |
| `detailPanel` | Renders the right panel with toolbar + scrollable sections |
| `formSection` | Groups fields with label, layout, collapsible state |
| `formField` | Single field — type, label, edit config, optional options API |

These are registered in `form-engine/bootstrap.ts` on app startup — identical pattern to table engine bootstrap.

---

## Config Shape

```ts
// DAGFormConfig — mirrors DAGTableConfig
export interface DAGFormConfig {
  formId: string;
  acceptedTypes: string[];      // e.g. ["ChangeAction"]
  dropParamName: string;        // e.g. "nodeId" → injected as $params.nodeId
  dag: {
    nodes: DAGNode[];           // same DAGNode union type as tables
    edges: DAGEdge[];
    rootNodeId: string;
  };
}
```

### headerForm Node Config
```ts
{
  id: "header",
  type: "headerForm",
  config: {
    sourceNodeId: "root-api",
    imageField: "icon",
    titleField: "title",
    nameField: "name",
    badgeField: "state",
    badgeColorMap: { "Draft": "blue", "In Work": "yellow", "Released": "green" },
    collapsedFields: [],
    expandedFields: ["owner", "collabSpace"],
    keyValueFields: ["applicability", "organization", "dependency", "flowdown"],
    infoIconTogglesDetailPanel: true,
  }
}
```

### detailPanel Node Config
```ts
{
  id: "detail",
  type: "detailPanel",
  config: {
    sourceNodeId: "root-api",
    saveApiNodeId: "save-api",
    rowKeyField: "identifier",
    sections: ["core-section", "dates-section"],
    toolbar: {
      showSave: true,
      showClose: true,
      showEdit: true,
    },
    skeletonRows: 8,
  }
}
```

### formSection Node Config
```ts
{
  id: "core-section",
  type: "formSection",
  config: {
    label: "Core Details",
    layout: "grid",           // "horizontal" | "vertical" | "grid"
    columns: 2,
    collapsible: true,
    defaultCollapsed: false,
    fieldIds: ["name", "title", "state", "severity", "owner"],
  }
}
```

### formField Node Config
```ts
{
  id: "state",
  type: "formField",
  config: {
    fieldType: "badge",       // one of 10 types
    label: "Maturity State",
    sourceField: "state",
    editable: true,
    optionsApiNodeId: "state-options-api",   // optional — for dropdowns
    badgeColorMap: { "Draft": "blue" },
  }
}
```

---

## Field Type Registry

Injectable registry — same pattern as `node-registry`:

```ts
interface FieldTypeDefinition {
  type: string;
  ReadComponent: React.FC<FieldReadProps>;
  EditComponent: React.FC<FieldEditProps>;
}

registerFieldType(definition: FieldTypeDefinition): void
```

### Built-in Field Types (10)

| Type | Read | Edit |
|---|---|---|
| `text` | plain string | `<Input>` |
| `date` | formatted date | `<DatePicker>` |
| `badge` | `<Badge>` with color map | `<Select>` |
| `link` | `<a>` with icon | `<Input>` |
| `dropdown` | label string | `<Select>` / `<Combobox>` |
| `number` | formatted number | `<Input type="number">` |
| `boolean` | Yes/No icon | `<Switch>` |
| `image` | `<Avatar>` thumbnail | read-only |
| `richtext` | rendered HTML | `<Textarea>` |
| `keyvalue` | label: value pairs | read-only |

---

## useDAGForm Hook

```ts
interface UseDAGFormResult {
  headerData: Record<string, JsonPrimitive>;
  detailData: Record<string, JsonPrimitive>;
  isLoading: boolean;
  error: Error | null;               // DAG load error — consumers can react programmatically
  isEditing: boolean;
  dirtyFields: Record<string, JsonPrimitive>;
  setFieldValue: (fieldId: string, value: JsonPrimitive) => void;
  save: () => Promise<void>;
  toggleEditMode: () => void;
  isCollapsed: boolean;              // headerForm collapsed state
  toggleCollapsed: () => void;
}
// JsonPrimitive = string | number | boolean | null (from dag.types.ts)
```

---

## ConfiguredForm Component

```tsx
interface ConfiguredFormProps {
  config: DAGFormConfig;
  params?: Record<string, JsonPrimitive>;   // consistent with ConfiguredTable.params
  onToggleDetail?: () => void;              // called when ℹ icon clicked
}

export function ConfiguredForm({ config, params, onToggleDetail }: ConfiguredFormProps)
```

- Zero knowledge of panels or tabs
- Receives `params` from Layout Engine / feature route
- Fires `onToggleDetail` — Layout Engine decides what to do with it
- Toast (sonner) on save error

---

## Folder Structure

```
src/components/form-engine/
├── core/
│   ├── form-dag-runner.ts         # thin wrapper — calls existing dag-engine
│   ├── form-node-registry.ts      # registers form node types
│   └── field-type-registry.ts     # injectable field renderer/editor registry
├── nodes/
│   ├── header-form-node.tsx
│   ├── detail-panel-node.tsx
│   ├── form-section-node.tsx
│   └── form-field-node.tsx
├── fields/
│   ├── text-field.tsx
│   ├── date-field.tsx
│   ├── badge-field.tsx
│   ├── link-field.tsx
│   ├── dropdown-field.tsx
│   ├── number-field.tsx
│   ├── boolean-field.tsx
│   ├── image-field.tsx
│   ├── richtext-field.tsx
│   ├── keyvalue-field.tsx
│   └── index.ts
├── hooks/
│   └── use-dag-form.ts
├── types/
│   └── form.types.ts
├── configured-form.tsx
├── bootstrap.ts
└── index.ts
```

---

## Node Resolution for formSection / formField

`formSection` and `formField` nodes are **not connected via DAG edges**. They are referenced by ID within `detailPanel.config.sections` and `formSection.config.fieldIds`. The `detail-panel-node` executor resolves these by direct node ID lookup (bypassing the edge graph), similar to how `rowExpandNode` looks up `childApiNodeId`.

To prevent the DAG validator from flagging these as orphaned, the validator is extended to recognise `formSection` and `formField` as "content nodes" that are allowed to exist without edges.

`optionsApiNodeId` on a `formField` follows the same lazy-fetch pattern as `rowEnrich`'s `childApiNodeId` — the executor fires the options API node on-demand (when the field enters edit mode) and is not part of the initial DAG wave.

## Bootstrap Wiring

`form-engine/bootstrap.ts` is called from `src/main.tsx` (app entry point) before the router renders — same location as any future `tab-engine/bootstrap.ts` and `layout-engine/bootstrap.ts`. This is the single global call site.

```ts
// src/main.tsx
import { bootstrapFormEngine } from '@/components/form-engine/bootstrap';
import { bootstrapTabEngine } from '@/components/tab-engine/bootstrap';
import { bootstrapLayoutEngine } from '@/components/layout-engine/bootstrap';

bootstrapFormEngine();   // registers headerForm, detailPanel, formSection, formField nodes
bootstrapTabEngine();    // registers table, form, tabs content types — runs after formEngine
bootstrapLayoutEngine(); // registers layout routes — runs last
```

## Error Handling

- Save API failure → `toast.error(message)` via sonner
- DAG API failure on load → `error` field set on `useDAGForm` result + `toast.error`; skeleton remains visible
- Field validation (required, type mismatch) → inline field error message
- `image` field with `editable: true` → no-op in edit mode; dev-mode `console.warn` logged
- `richtext` field type renders with `<Textarea>` in Phase 1 (plain text editing); will be upgraded to a rich text editor in a future phase. The type name is kept as `richtext` to avoid a breaking rename later.

---

## Styling

- Glassmorphism (`bg-background/80 backdrop-blur-md`) consistent with existing design
- `HeaderForm` expanded: icon + title + badge + owner + key-value grid (matches screenshot)
- `HeaderForm` collapsed: single line — icon + title + badge only
- `DetailPanel`: fixed-width right panel, scrollable content, sticky toolbar
- Skeleton states for both `HeaderForm` and `DetailPanel`
- Icons: `lucide-react` only

---

## Example Config (Change Action Form)

```ts
// src/features/xen/configs/ca-form.config.ts
export const caFormConfig: DAGFormConfig = {
  formId: "ca-form",
  acceptedTypes: ["ChangeAction"],
  dropParamName: "nodeId",
  dag: {
    nodes: [
      { id: "root-api", type: "api", config: { url: CA_DETAIL_URL, method: "GET", authAdapterId: "wafdata", ... } },
      { id: "save-api", type: "api", config: { url: CA_DETAIL_URL, method: "PATCH", authAdapterId: "wafdata", ... } },
      { id: "header", type: "headerForm", config: { sourceNodeId: "root-api", ... } },
      { id: "core-section", type: "formSection", config: { label: "Core Details", fieldIds: ["name", "title", "state"] } },
      { id: "name", type: "formField", config: { fieldType: "text", label: "Name", sourceField: "name", editable: false } },
      { id: "title", type: "formField", config: { fieldType: "text", label: "Title", sourceField: "title", editable: true } },
      { id: "state", type: "formField", config: { fieldType: "badge", label: "Maturity State", sourceField: "state", editable: true, badgeColorMap: { Draft: "blue" } } },
      { id: "detail", type: "detailPanel", config: { sourceNodeId: "root-api", saveApiNodeId: "save-api", sections: ["core-section"] } },
    ],
    edges: [
      { from: "root-api", to: "header" },
      { from: "root-api", to: "detail" },
    ],
    rootNodeId: "detail",
  },
};
```
