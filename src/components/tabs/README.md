# Tab System

A configurable tab system for 3DExperience widgets.

## Components

### TabContainer

The main tab component that renders a tab bar and content area.

```tsx
import { TabContainer } from "@/components/tabs";

<TabContainer
  tabs={[
    { id: "members", label: "Members", content: { type: "table", tableId: "members-table" } },
    { id: "changes", label: "Proposed Changes", badge: "3", content: { type: "table", tableId: "changes-table" } },
  ]}
  defaultActiveId="changes"
  renderContent={(tab) => <MyContent tab={tab} />}
/>
```

### Tab

Individual tab trigger button with support for icons, badges, and disabled state.

## Config Interface

```typescript
interface TabConfig {
  id: string;
  label: string;
  icon?: string;
  badge?: string | { dataSource: string; expression: string };
  content: TabContentConfig;
  visible?: boolean | string;
  disabled?: boolean | string;
}

interface TabContentConfig {
  type: 'table' | 'form' | 'tabs' | 'custom' | 'layout';
  tableId?: string;
  formId?: string;
  tabs?: TabConfig[];
  layoutId?: string;
}
```

## Features

- Configurable via `TabConfig` objects
- Nested sub-tabs (type: 'tabs')
- Badge support (static or data-driven)
- Icon support
- Conditional visibility and disabled state
- 3DExperience-style tab bar with underline active indicator
