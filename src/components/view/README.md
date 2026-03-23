# ViewRenderer

Top-level component that takes a `ViewConfig` and renders a complete 3DExperience view by composing layout, forms, tabs, and tables together.

## Usage

```tsx
import { ViewRenderer } from "@/components/view";
import { changeActionConfig } from "@/configs/examples/change-action.config";

<ViewRenderer
  config={changeActionConfig}
  data={objectData}
/>
```

## How It Works

1. The `ViewConfig` defines the complete view structure:
   - **context**: Object type, ID, and data source
   - **layout**: How components are arranged (split, stack, sidebar)
   - **forms**: Form configurations keyed by ID
   - **tabs**: Tab configurations keyed by ID
   - **tables**: Table/data-grid configurations keyed by ID

2. The `ViewRenderer` delegates to the `LayoutEngine` which renders the structural layout.

3. Each layout child is resolved to a component:
   - `header-form` → `HeaderForm` component
   - `tabs` → `TabContainer` component
   - `table` → DataGrid placeholder (connect your own)
   - `detail-panel` → `DetailPanel` component
   - `layout` → Nested `LayoutEngine`

4. Tab content is resolved similarly, supporting tables, forms, nested tabs, and custom layouts.

## Config Interface

```typescript
interface ViewConfig {
  id: string;
  title: string;
  description?: string;
  context: {
    type: string;
    objectId?: string;
    dataSource: DataSourceConfig;
  };
  layout: LayoutConfig;
  forms: Record<string, FormConfig>;
  tabs: Record<string, TabConfig[]>;
  tables: Record<string, unknown>;
}
```
