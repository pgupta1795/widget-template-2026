# Form Engine + Object Detail View — Design Spec

**Date**: 2026-03-30
**Status**: Draft
**Feature**: `src/components/form-engine/` + `src/features/change/`

---

## 1. Overview

Build a **Form Engine** that mirrors the Table Engine's philosophy: JSON-driven, catalog-based, plug-and-play. It renders form fields from a JSON schema, supports inline editing with per-field API mutations, and integrates with the existing WAFData service layer and TanStack Query.

The first consumer is an **Object Detail View** for 3DEXPERIENCE Change Actions, matching the platform's native layout: header bar + resizable main/properties panels + tabbed tables.

## 2. Architecture

### Integration Model

```
FormSchema (JSON)
  -> schemaResolver (fields[] -> json-render element tree)
  -> defineCatalog() + defineRegistry() (component mapping)
  -> json-render Renderer (renders the spec)
  -> Each field component uses react-hook-form useController()
  -> InlineEditField wrapper handles read/edit mode + useMutation
```

### Responsibility Split

| Concern | Owner |
|---------|-------|
| Component tree rendering | json-render (`Renderer`, `defineRegistry`) |
| Form values & validation | react-hook-form (`useFormContext`, `useController`) |
| UI state (edit modes, panel visibility) | json-render `StateProvider` + `$bindState` |
| Visibility conditions | json-render visibility system (`$state`, `eq`, `not`) |
| Field-level API writes | `useWafMutation` from `src/services/` |
| Initial data fetch | `useWafQuery` from `src/services/` |
| Cross-field dependencies | json-render `$cond` expressions |
| Event handling | json-render `emit`/`on` event system |

### Data Flow

1. `useWafQuery` fetches initial data -> populates RHF `defaultValues`
2. User clicks a field -> `InlineEditField` switches to edit mode
3. On save trigger -> `useWafMutation` fires the field's `apiBinding`
4. On success -> RHF value updated, field returns to read mode
5. On error -> reverts to previous value, sonner toast

## 3. Form Schema JSON Structure

```typescript
interface FormSchema {
  id: string;
  title: string;
  layout: "vertical" | "grid" | "sections";
  columns?: number;               // for grid layout
  fetch?: {
    url: string;                   // supports :param interpolation
    queryKey: string[];
    responseTransform?: string;    // JSONata expression
  };
  fields: FormFieldDescriptor[];
}

interface FormFieldDescriptor {
  name: string;                    // maps to data key (JSON pointer path)
  label: string;
  type: FieldType;                 // text | number | select | multiselect | date | checkbox | switch | textarea | combobox | file | richtext
  defaultValue?: unknown;
  readOnly?: boolean;              // default false
  required?: boolean;
  placeholder?: string;
  options?: string[] | { label: string; value: string }[];
  validations?: ValidationRule[];  // -> dynamically built Zod schema
  editTrigger?: "click" | "icon" | "always";  // default "click"
  saveStrategy?: "onBlur" | "onEnter" | "explicit";  // default "onBlur"
  apiBinding?: {
    method: "PATCH" | "PUT" | "POST";
    url: string;                   // supports :param interpolation
    bodyKey?: string;              // wraps value as { [bodyKey]: value }
    headers?: Record<string, string>;
  };
  visible?: VisibilityCondition;   // json-render visibility expression
  className?: string;
  colSpan?: number;                // grid column span
}

interface ValidationRule {
  type: "required" | "minLength" | "maxLength" | "min" | "max" | "pattern" | "email" | "url";
  value?: unknown;
  message: string;
}

type FieldType = "text" | "number" | "select" | "multiselect" | "date" | "checkbox" | "switch" | "textarea" | "combobox" | "file" | "richtext";
```

## 4. Form Catalog (json-render)

Uses `defineCatalog()` from `@json-render/core` with `@json-render/shadcn` for layout components and custom form field definitions with Zod-validated props.

```typescript
const formCatalog = defineCatalog(schema, {
  components: {
    // Layout (from @json-render/shadcn)
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Grid: shadcnComponentDefinitions.Grid,
    Heading: shadcnComponentDefinitions.Heading,
    Separator: shadcnComponentDefinitions.Separator,
    Tabs: shadcnComponentDefinitions.Tabs,
    Text: shadcnComponentDefinitions.Text,

    // Form fields (custom definitions)
    FormField: { props: z.object({ ... }), description: "Generic form field wrapper" },
    // Each field type registered in fieldRegistry
  },
  actions: {},
});
```

## 5. Field Registry (Strategy Pattern)

```typescript
type FieldRenderer = (props: FieldRendererProps) => React.ReactNode;

interface FieldRendererProps {
  descriptor: FormFieldDescriptor;
  control: Control;           // from react-hook-form
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const fieldRegistry = new Map<FieldType, FieldRenderer>();

// Pre-registered types:
// text, number, select, multiselect, date, checkbox, switch, textarea, combobox
// Extensible: consumers can register custom types
```

## 6. InlineEditField

State machine: `idle -> editing -> saving -> idle` (or `editing -> error -> editing`)

```
Props:
  - descriptor: FormFieldDescriptor
  - value: current display value
  - editTrigger: "click" | "icon" | "always"
  - saveStrategy: "onBlur" | "onEnter" | "explicit"

Behavior:
  - idle: renders read-only display value (text, badge, formatted date)
  - click/icon triggers edit mode (unless readOnly)
  - Escape always cancels, reverts to previous value
  - Save trigger fires useWafMutation with apiBinding config
  - 300ms debounce on mutation, cancelable
  - Loading: shows spinner on the field
  - Error: sonner toast + revert to previous value
  - Success: update RHF value, return to idle
```

## 7. API Adapter (reuses existing services)

```typescript
interface FormApiAdapter {
  fetchData(config: FetchConfig): Promise<Record<string, unknown>>;
  updateField(config: UpdateConfig): Promise<unknown>;
  batchUpdate?(fields: UpdateConfig[]): Promise<void>;
}

// Concrete implementation uses httpClient from src/services/
// fetchData -> httpClient.get()
// updateField -> httpClient[method]() based on apiBinding.method
```

Hooks reuse existing patterns:
- `useFormData(fetchConfig)` wraps `useWafQuery`
- `useFieldMutation(apiBinding)` wraps `useWafMutation`

## 8. FormEngine Orchestrator

```
1. Reads schema.fetch -> useFormData() for initial values
2. Creates react-hook-form instance with defaultValues from fetch
3. Runs schemaResolver to convert fields[] -> json-render element tree
4. Wraps in json-render StateProvider (for UI state: edit mode flags)
5. Wraps in FormEngineProvider (DI: adapter, registry, hooks)
6. Renders via json-render Renderer with form registry
```

## 9. Object Detail View (Change Action)

Layout matching 3DEXPERIENCE native:

```
+----------------------------------------------------------+
| [CA Icon]  CHG-01                                  [Info] |
| Maturity: [Draft v]  Owner: User1                         |
| Collab Space: Common Space                                |
| Applicability: No  Dependency: No  Org: CompanyName       |
+-----------------------------------+----------------------+
|                                   | CHG-01               |
| Members | Proposed | Realized | A | User1  Mar 18...     |
| ------------------------------- | [toolbar icons]        |
| |                             | |------------------------|
| | TABLE (per active tab)      | | Type                   |
| |                             | |   Change Action        |
| |                             | | Title                  |
| |                             | |   CHG-01               |
| |                             | | Name                   |
| +-----------------------------+ |   CA-9327401-00000001  |
| Total: 3  Selected: 0          | Severity               |
|                                 |   Medium               |
|    <-- resizable handle -->     | Planned Start Date     |
|                                 | ...                    |
+---------------------------------+------------------------+
```

### Components

- **ObjectDetailView** — top-level shell: HeaderBar + ResizablePanelGroup
- **HeaderBar** — read-only key fields rendered from `headerFields[]` in config
- **PropertiesPanel** — right panel: toolbar + FormEngine (layout: "vertical")
- **DetailTabs** — tab definitions where each tab -> `ConfiguredTable` with its own `DAGTableConfig`

### Info icon toggles the right panel:
- Panel collapses to 0 width (or minimal width)
- Main content expands to fill
- Uses `ResizablePanelGroup` with `onLayout` + imperative `collapse()`/`expand()`

## 10. Object Detail Config Schema

```typescript
interface ObjectDetailConfig {
  id: string;
  title: string;
  icon?: string;                    // lucide icon name
  header: {
    titleField: string;             // field name for main title
    subtitleFields?: HeaderField[]; // key-value pairs in header
    badgeField?: string;            // field shown as badge (e.g., maturity state)
  };
  propertiesPanel: {
    form: FormSchema;               // FormEngine schema for right panel
    defaultOpen?: boolean;          // default true
    defaultSize?: number;           // default 25 (% width)
    minSize?: number;               // default 15
  };
  tabs: TabConfig[];
}

interface TabConfig {
  id: string;
  label: string;
  icon: string;                     // lucide icon name
  type: "table";                    // extensible: "form" | "custom" later
  tableConfig: DAGTableConfig;      // existing table engine config
}

interface HeaderField {
  field: string;
  label: string;
  type?: "text" | "badge" | "link";
  linkPrefix?: string;
}
```

## 11. File Structure

```
src/components/
  form-engine/
    index.ts                         # public barrel
    FormEngine.tsx                   # orchestrator: RHF + json-render Renderer
    FormEngineProvider.tsx           # context/DI: adapter, catalog, registry, hooks
    InlineEditField.tsx              # read/edit mode wrapper with mutation
    form-catalog.ts                  # defineCatalog() with form field defs
    form-registry.ts                 # defineRegistry() mapping to React components
    field-registry.ts                # Map<FieldType, FieldRenderer> strategy
    hooks/
      use-form-data.ts              # useWafQuery wrapper for initial fetch
      use-field-mutation.ts         # useWafMutation wrapper per field
    adapters/
      form-api-adapter.ts           # interface
      wafdata-form-adapter.ts       # concrete using httpClient
    fields/
      TextField.tsx
      NumberField.tsx
      SelectField.tsx
      SwitchField.tsx
      CheckboxField.tsx
      TextareaField.tsx
      DateField.tsx
      ComboboxField.tsx
      index.ts                      # barrel + default registry population
    utils/
      schema-resolver.ts            # FormSchema -> json-render element tree
      validation-builder.ts         # field validations[] -> Zod schema
      types.ts                      # all form engine types

  object-detail/
    index.ts                        # public barrel
    ObjectDetailView.tsx            # shell: header + resizable panels
    HeaderBar.tsx                   # read-only header fields
    PropertiesPanel.tsx             # right panel: toolbar + FormEngine
    DetailTabs.tsx                  # tabs -> ConfiguredTable per tab
    types.ts                        # ObjectDetailConfig, TabConfig, HeaderField

src/features/change/
  components/
    change-action-detail.tsx        # ObjectDetailView consumer for CA
  configs/
    change-action-detail.config.ts  # ObjectDetailConfig with header, form, tabs
    change-action-tabs.config.ts    # DAGTableConfig per tab (members, proposed, realized, approvals)

src/routes/
  change.tsx                        # /change route -> ChangeActionDetail
```

## 12. Route & Navigation

New route at `/change`, added to `NAV_ITEMS` with `GitPullRequest` icon from lucide-react.

The route renders `ChangeActionDetail` which uses `ObjectDetailView` with the change action config. Initially shows a search/selection UI, then drills into the detail view (similar to how xen handles nodeId via drop zone).

## 13. Constraints

- All form engine files in `src/components/form-engine/` (not `src/engines/`)
- All change feature files in `src/features/change/`
- Reuse `useWafQuery`/`useWafMutation` from `src/services/` (no new HTTP abstractions)
- Reuse `ConfiguredTable` from table engine for all tab tables
- Use shadcn/ui components from `src/components/ui/` for all form inputs
- Use `#/*` absolute imports throughout
- No test files, no Storybook stories
- Inline edit mutations debounced 300ms, cancelable on Escape
- Loading states: shadcn Skeleton; errors: sonner toast
- Follow glassmorphism styling (`bg-background/80 backdrop-blur-md`)
- Icons from lucide-react only
