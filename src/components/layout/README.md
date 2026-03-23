# Layout Engine

Composable layout system for arranging tabs, forms, and tables together in 3DExperience widgets.

## Components

### LayoutEngine

Top-level dispatcher that renders the correct layout based on config type.

```tsx
import { LayoutEngine } from "@/components/layout";

<LayoutEngine
  config={layoutConfig}
  renderChild={(child, index) => <ChildComponent key={index} child={child} />}
/>
```

### SplitLayout

Renders children in resizable split panels using `react-resizable-panels`.

- **direction**: `"horizontal"` | `"vertical"`
- **sizes**: Array of percentage sizes for each child (e.g., `[70, 30]`)
- **resizable**: Whether panels can be resized (default: true)

### StackLayout

Renders children in a vertical stack. Flexible children (tabs, tables, layouts) expand to fill available space.

### SidebarLayout

Main content + collapsible side panel. First child is main, second is sidebar.

- **sizes**: `[mainSize, sidebarSize]` as percentages
- **resizable**: Whether the split is resizable
- Sidebar supports collapse/expand via the `collapsible` flag

## Config Interface

```typescript
interface LayoutConfig {
  id: string;
  type: 'split' | 'stack' | 'sidebar';
  direction?: 'horizontal' | 'vertical';
  sizes?: number[];
  resizable?: boolean;
  children: LayoutChildConfig[];
}

interface LayoutChildConfig {
  type: 'header-form' | 'tabs' | 'table' | 'detail-panel' | 'layout';
  configId: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  minSize?: number;
  maxSize?: number;
}
```
