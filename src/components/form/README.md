# Form System

Configurable form components for displaying object metadata in 3DExperience widgets.

## Components

### HeaderForm

Compact, read-mostly display at the top of a view. Shows object icon, title, state badge, owner, and key-value pairs in a horizontal layout.

```tsx
import { HeaderForm } from "@/components/form";

<HeaderForm
  config={headerFormConfig}
  data={{ title: "CHG-01", state: "Draft", owner: "User1 User1" }}
/>
```

### DetailPanel

Collapsible right-side panel showing full object details as vertical label-value pairs with a toolbar and close button.

```tsx
import { DetailPanel } from "@/components/form";

<DetailPanel
  config={detailFormConfig}
  data={objectData}
  isOpen={true}
  onClose={() => setOpen(false)}
/>
```

### FormField

Individual field renderer supporting multiple types:
- `text` - Plain text display
- `date` - Formatted date display
- `badge` / `state` - Colored badge with configurable color mapping
- `link` - Clickable link with URL template
- `dropdown` - Dropdown selector (read mode shows text)
- `number` - Numeric display with tabular nums
- `boolean` - Yes/No display
- `image` - Image thumbnail
- `richtext` - Rich text content

### FormSection

Groups fields with an optional label and collapsible behavior. Supports three layouts:
- `horizontal` - Fields in a row (for header forms)
- `vertical` - Fields stacked (for detail panels)
- `grid` - CSS grid with configurable columns

## Config Interface

```typescript
interface FormConfig {
  id: string;
  type: 'header' | 'detail' | 'edit';
  title?: string;
  dataSource: DataSourceConfig;
  sections: FormSectionConfig[];
  toolbar?: ToolbarConfig;
}
```
