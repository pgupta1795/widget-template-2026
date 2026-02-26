# Enterprise PLM Dashboard UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the bare-bones widget template into a polished enterprise PLM dashboard with sidebar navigation, enterprise theme, and redesigned components.

**Architecture:** Config-driven sidebar navigation added to the existing WidgetConfig type system. WidgetShell restructured from single-column to sidebar+main layout. All feature components restyled with the enterprise PLM color scheme. Details panel converted from Sheet overlay to inline sticky panel.

**Tech Stack:** React 19, TanStack Router/Query/Table, Tailwind CSS v4, shadcn/ui (base-mira), Lucide React, class-variance-authority

---

### Task 1: Update Theme Variables

**Files:**

- Modify: `src/index.css`

**Step 1: Replace the `:root` light-mode CSS variables**

Replace the entire `:root` block in `src/index.css` with the enterprise PLM color scheme. Key changes:

- `--background`: change from pure white oklch to `#F6F8FA` (oklch equivalent: `oklch(0.976 0.003 247.858)`)
- `--foreground`: `#111827` → `oklch(0.145 0.014 253.101)`
- `--primary`: `#2563EB` → `oklch(0.546 0.245 262.881)` (keep — already close)
- `--primary-foreground`: pure white `oklch(1 0 0)`
- `--muted`: `#F3F4F6` → `oklch(0.961 0.003 264.542)`
- `--muted-foreground`: `#6B7280` → `oklch(0.556 0.014 264.436)`
- `--border`: `#E5E7EB` → `oklch(0.918 0.005 264.531)`
- `--card`: pure white `oklch(1 0 0)` (keep)
- `--sidebar-accent`: `#EFF6FF` → `oklch(0.97 0.014 254.604)`
- `--radius`: change from `0.45rem` to `0.375rem`

Also add a new custom property `--primary-hover` with value `#1D4ED8` → `oklch(0.488 0.243 264.376)`.

**Step 2: Verify Tailwind picks up new variables**

Run: `npx biome check src/index.css`
Expected: No errors (CSS file passes linting)

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: update theme to enterprise PLM color scheme"
```

---

### Task 2: Update Badge Variant Colors

**Files:**

- Modify: `src/components/ui/badge.tsx`

**Step 1: Update badge variant classes**

In `src/components/ui/badge.tsx`, update the `info`, `success`, and `warning` variants in the `badgeVariants` cva call to use the exact design spec colors:

- `info`: change to `"bg-[#DBEAFE] text-[#1E40AF] dark:bg-blue-500/20 dark:text-blue-400 border-transparent"`
- `success`: change to `"bg-[#DCFCE7] text-[#166534] dark:bg-green-500/20 dark:text-green-400 border-transparent"`
- `warning`: change to `"bg-[#FEF3C7] text-[#92400E] dark:bg-amber-500/20 dark:text-amber-400 border-transparent"`
- `secondary` (used for Draft): change to `"bg-[#F3F4F6] text-[#374151] dark:bg-neutral-800 dark:text-neutral-300 border-transparent"`

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "style: update badge variants to enterprise PLM colors"
```

---

### Task 3: Add Sidebar Config Types

**Files:**

- Modify: `src/types/config.ts`

**Step 1: Add new types at the end of the file, before the WidgetConfig type**

Add these types:

```typescript
export type SidebarItemType = 'link' | 'action' | 'divider';

export type SidebarItem = {
  id: string;
  label: string;
  icon?: string;
  type: SidebarItemType;
  view?: string;
  action?: string;
  active?: boolean;
};

export type SidebarSection = {
  id: string;
  title: string;
  description?: string;
  items: SidebarItem[];
};

export type SidebarConfig = {
  title: string;
  description?: string;
  sections: SidebarSection[];
  collapsible?: boolean;
  defaultWidth?: number;
};
```

**Step 2: Add `sidebar` to `WidgetConfig`**

Add `sidebar?: SidebarConfig;` to the `WidgetConfig` type.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/types/config.ts
git commit -m "feat: add SidebarConfig types to widget config system"
```

---

### Task 4: Add Sidebar Configuration to Engineering BOM Widget

**Files:**

- Modify: `src/config/widgets/engineering-bom.ts`

**Step 1: Add sidebar config to the engineering BOM widget**

Add a `sidebar` property to `engineeringBomConfig`:

```typescript
sidebar: {
	title: "Engineering BOM",
	description: "Browse and manage engineering bill of materials",
	sections: [
		{
			id: "access",
			title: "Access Your Work",
			items: [
				{ id: "recents", label: "Recents", icon: "clock", type: "link", view: "recents", active: true },
				{ id: "open", label: "Open", icon: "folder-open", type: "link", view: "open" },
				{ id: "my-products", label: "My Products", icon: "box", type: "link", view: "my-products" },
			],
		},
		{
			id: "new",
			title: "Start a New Activity",
			items: [
				{ id: "new-product", label: "New Product", icon: "plus-square", type: "action", action: "create-product" },
				{ id: "new-part", label: "New Part", icon: "plus-square", type: "action", action: "create-part" },
			],
		},
	],
	collapsible: true,
	defaultWidth: 220,
},
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/config/widgets/engineering-bom.ts
git commit -m "feat: add sidebar configuration to engineering BOM widget"
```

---

### Task 5: Create Sidebar Component

**Files:**

- Create: `src/features/sidebar/sidebar.tsx`

**Step 1: Create the sidebar feature directory and component**

Create `src/features/sidebar/sidebar.tsx` with this implementation:

```tsx
import { cn } from '@/lib/utils';
import type {
  SidebarConfig,
  SidebarItem as SidebarItemType,
  SidebarSection,
} from '@/types/config';
import {
  Box,
  Clock,
  FolderOpen,
  PlusSquare,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  clock: Clock,
  'folder-open': FolderOpen,
  box: Box,
  'plus-square': PlusSquare,
};

type SidebarProps = {
  config: SidebarConfig;
  activeView: string;
  onViewChange: (view: string) => void;
  onAction?: (action: string) => void;
  className?: string;
};

export function Sidebar({
  config,
  activeView,
  onViewChange,
  onAction,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card',
        className,
      )}
      style={{ width: config.defaultWidth ?? 220 }}
    >
      <div className='px-4 pt-4 pb-2'>
        <h2 className='text-sm font-semibold text-foreground'>
          {config.title}
        </h2>
        {config.description && (
          <p className='mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground'>
            {config.description}
          </p>
        )}
      </div>

      <nav className='flex-1 overflow-y-auto px-2 pb-4'>
        {config.sections.map((section, idx) => (
          <SidebarSectionGroup
            key={section.id}
            section={section}
            activeView={activeView}
            onViewChange={onViewChange}
            onAction={onAction}
            showDivider={idx > 0}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarSectionGroup({
  section,
  activeView,
  onViewChange,
  onAction,
  showDivider,
}: {
  section: SidebarSection;
  activeView: string;
  onViewChange: (view: string) => void;
  onAction?: (action: string) => void;
  showDivider: boolean;
}) {
  return (
    <div>
      {showDivider && <div className='mx-2 my-2 border-t border-border' />}
      <h3 className='px-2 pb-1 pt-3 text-[0.6875rem] font-semibold text-foreground'>
        {section.title}
      </h3>
      {section.description && (
        <p className='px-2 pb-1 text-[0.625rem] text-muted-foreground'>
          {section.description}
        </p>
      )}
      <ul className='space-y-0.5'>
        {section.items.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            isActive={item.view === activeView}
            onViewChange={onViewChange}
            onAction={onAction}
          />
        ))}
      </ul>
    </div>
  );
}

function SidebarNavItem({
  item,
  isActive,
  onViewChange,
  onAction,
}: {
  item: SidebarItemType;
  isActive: boolean;
  onViewChange: (view: string) => void;
  onAction?: (action: string) => void;
}) {
  if (item.type === 'divider') {
    return <div className='mx-2 my-2 border-t border-border' />;
  }

  const Icon = item.icon ? ICON_MAP[item.icon] : null;

  const handleClick = () => {
    if (item.type === 'link' && item.view) {
      onViewChange(item.view);
    } else if (item.type === 'action' && item.action) {
      onAction?.(item.action);
    }
  };

  return (
    <li>
      <button
        type='button'
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer',
          isActive
            ? 'border-l-2 border-l-primary bg-sidebar-accent text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'size-4 shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        )}
        <span>{item.label}</span>
      </button>
    </li>
  );
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/sidebar/sidebar.tsx
git commit -m "feat: create config-driven sidebar navigation component"
```

---

### Task 6: Restructure WidgetShell Layout

**Files:**

- Modify: `src/features/widget-shell/widget-shell.tsx`

**Step 1: Rewrite WidgetShell with sidebar + main content layout**

Replace the entire `widget-shell.tsx` with the new layout that:

1. Renders `Sidebar` on the left (if `config.sidebar` exists)
2. Renders main content on the right
3. Tracks `activeView` state (defaults to first sidebar item's view, or "recents")
4. When `activeView === "recents"` and no objectId: shows dropzone
5. When objectId is set: shows header + tabs + content (the object detail view)

```tsx
import { useCallback, useState } from 'react';
import { DropZone } from '@/features/drop-zone/drop-zone';
import type { DroppedObject } from '@/features/drop-zone/use-object-drop';
import { ObjectHeader } from '@/features/object-header/object-header';
import { Sidebar } from '@/features/sidebar/sidebar';
import { SidePanel } from '@/features/side-panel/side-panel';
import { TabManager } from '@/features/tab-manager/tab-manager';
import type {
  CommandDefinition,
  PanelConfig,
  WidgetConfig,
} from '@/types/config';
import { TabContentRenderer } from './tab-content-renderer';

type WidgetShellProps = {
  config: WidgetConfig;
};

export function WidgetShell({ config }: WidgetShellProps) {
  const [objectId, setObjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>(
    config.sidebar?.sections[0]?.items[0]?.view ?? 'recents',
  );
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null);
  const [panelObjectId, setPanelObjectId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleDrop = useCallback(
    (objects: DroppedObject[]) => {
      const first = objects[0];
      if (first) {
        const id = config.dropZone?.idField
          ? (first[config.dropZone.idField] as string)
          : first.objectId;
        setObjectId(id);
      }
    },
    [config.dropZone?.idField],
  );

  const handleCommand = useCallback(
    (command: CommandDefinition, row: Record<string, unknown>) => {
      switch (command.type) {
        case 'side-panel':
          if (command.panelConfig) {
            setPanelConfig(command.panelConfig);
            setPanelObjectId(
              (row.id as string) ?? (row.physicalId as string) ?? '',
            );
            setPanelOpen(true);
          }
          break;
        case 'navigate':
          break;
        case 'expand':
          break;
        case 'dialog':
          break;
        case 'action':
          break;
      }
    },
    [],
  );

  const handleSidebarAction = useCallback((_action: string) => {
    // Placeholder for sidebar actions (New Product, New Part)
  }, []);

  const params: Record<string, string> = objectId
    ? { physicalId: objectId, objectId, expandLevel: '1' }
    : {};

  return (
    <div className='flex h-full bg-background'>
      {config.sidebar && (
        <Sidebar
          config={config.sidebar}
          activeView={activeView}
          onViewChange={setActiveView}
          onAction={handleSidebarAction}
        />
      )}

      <div className='flex flex-1 flex-col overflow-hidden'>
        {objectId ? (
          <ObjectDetailView
            config={config}
            objectId={objectId}
            params={params}
            onDrop={handleDrop}
            onCommand={handleCommand}
          />
        ) : (
          <RecentsView config={config} onDrop={handleDrop} />
        )}
      </div>

      {panelConfig && (
        <SidePanel
          config={panelConfig}
          objectId={panelObjectId}
          open={panelOpen}
          onOpenChange={setPanelOpen}
        />
      )}
    </div>
  );
}

function RecentsView({
  config,
  onDrop,
}: {
  config: WidgetConfig;
  onDrop: (objects: DroppedObject[]) => void;
}) {
  if (!config.dropZone?.enabled) {
    return (
      <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
        Select an item from the sidebar to begin.
      </div>
    );
  }

  return (
    <div className='flex flex-1 items-center justify-center p-8'>
      <DropZone config={config.dropZone} onDrop={onDrop} />
    </div>
  );
}

function ObjectDetailView({
  config,
  objectId,
  params,
  onDrop,
  onCommand,
}: {
  config: WidgetConfig;
  objectId: string;
  params: Record<string, string>;
  onDrop: (objects: DroppedObject[]) => void;
  onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
}) {
  return (
    <>
      {config.header && (
        <ObjectHeader config={config.header} objectId={objectId} />
      )}

      {config.dropZone?.enabled ? (
        <DropZone config={config.dropZone} onDrop={onDrop}>
          <TabManager
            tabs={config.tabs}
            defaultTab={config.defaultTab}
            renderTabContent={(tab) => (
              <TabContentRenderer
                tab={tab}
                params={params}
                onCommand={onCommand}
              />
            )}
          />
        </DropZone>
      ) : (
        <TabManager
          tabs={config.tabs}
          defaultTab={config.defaultTab}
          renderTabContent={(tab) => (
            <TabContentRenderer
              tab={tab}
              params={params}
              onCommand={onCommand}
            />
          )}
        />
      )}
    </>
  );
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/widget-shell/widget-shell.tsx
git commit -m "feat: restructure WidgetShell with sidebar + main content layout"
```

---

### Task 7: Redesign DropZone Component

**Files:**

- Modify: `src/features/drop-zone/drop-zone.tsx`

**Step 1: Update the empty-state dropzone UI**

Redesign the empty state (when no `children` are present) to match the enterprise PLM spec:

- Centered `max-w-sm` container
- Thin dashed border `border-border`
- Upload icon in `text-muted-foreground`
- "Drop here to open" text
- Separator line with "or"
- Primary "Start with New Product" button
- Professional hover state: `bg-primary/5 border-primary`

Replace the `children ?? (...)` fallback JSX with:

```tsx
{
  children ?? (
    <div className='flex flex-col items-center justify-center gap-4 p-10 text-center'>
      <div className='rounded-full bg-muted p-3'>
        <Upload className='size-6 text-muted-foreground' />
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-medium text-foreground'>
          {config.message ?? 'Drop here to open'}
        </p>
        {config.acceptTypes && (
          <p className='text-xs text-muted-foreground'>
            Accepts: {config.acceptTypes.join(', ')}
          </p>
        )}
      </div>
      <div className='flex w-full items-center gap-3'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-xs text-muted-foreground'>or</span>
        <div className='h-px flex-1 bg-border' />
      </div>
      <button
        type='button'
        className='rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer'
      >
        Start with New Product
      </button>
    </div>
  );
}
```

Also update the outer container classes:

- Change `min-h-30` to `min-h-0`
- Change the max-width to `max-w-sm` when no children
- Adjust hover state border color

**Step 2: Run type check and Biome format**

Run: `npx tsc --noEmit && npx biome check --write src/features/drop-zone/drop-zone.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/drop-zone/drop-zone.tsx
git commit -m "style: redesign dropzone to enterprise PLM empty state"
```

---

### Task 8: Redesign ObjectHeader Component

**Files:**

- Modify: `src/features/object-header/object-header.tsx`

**Step 1: Update the header layout to match enterprise spec**

Key changes to `object-header.tsx`:

1. Add breadcrumbs row above the title: `Home / {widgetTitle} / {objectTitle}`
2. Change icon size from `size-16` to `size-12` (48px including padding)
3. Add right-side action icon buttons (Search, Refresh, Settings, Help)
4. Update background from `bg-card` to `bg-card` (keep) but ensure the container has clean enterprise styling
5. Keep the existing data-fetching and state badge logic

The component needs a new prop `widgetTitle?: string` for breadcrumbs.

Update the return JSX to:

```tsx
<div className={cn('border-b border-border bg-card', className)}>
  {/* Breadcrumbs */}
  <div className='flex items-center gap-1.5 px-4 pt-3 text-xs text-muted-foreground'>
    <span className='cursor-pointer hover:text-foreground'>Home</span>
    <span>/</span>
    <span className='cursor-pointer hover:text-foreground'>
      {widgetTitle ?? 'Widget'}
    </span>
    <span>/</span>
    <span className='text-foreground'>{title}</span>
  </div>

  {/* Title row */}
  <div className='flex items-start gap-3 px-4 pt-2 pb-3'>
    {iconUrl && (
      <div className='flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50'>
        <img src={iconUrl} alt={objectType} className='size-8 object-contain' />
      </div>
    )}

    <div className='flex-1 min-w-0'>
      <div className='flex items-center gap-2'>
        <h1 className='text-sm font-semibold text-foreground truncate'>
          {title}
        </h1>
        {state && (
          <Badge
            variant={getStateBadgeVariant(state, config.stateBadgeVariants)}
          >
            {state}
          </Badge>
        )}
      </div>

      {/* Metadata row */}
      <div className='mt-1.5 flex flex-wrap gap-x-5 gap-y-1'>
        {config.fields.map((field) => {
          const value = record[field.key];
          if (value == null || value === '') return null;
          return (
            <div key={field.key} className='flex items-center gap-1 text-xs'>
              <span className='text-muted-foreground'>{field.label}:</span>
              {/* ...existing field rendering logic stays the same... */}
            </div>
          );
        })}
      </div>
    </div>

    {/* Right-side action icons */}
    <div className='flex items-center gap-1 shrink-0'>
      <button
        type='button'
        className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
      >
        <Search className='size-4' />
      </button>
      <button
        type='button'
        className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
      >
        <RefreshCw className='size-4' />
      </button>
      <button
        type='button'
        className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
      >
        <Settings className='size-4' />
      </button>
      <button
        type='button'
        className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
      >
        <HelpCircle className='size-4' />
      </button>
    </div>
  </div>
</div>
```

Add necessary Lucide imports: `Search, RefreshCw, Settings, HelpCircle`.

Update the component props type to include `widgetTitle?: string`.

**Step 2: Update WidgetShell to pass widgetTitle to ObjectHeader**

In `widget-shell.tsx`, where `<ObjectHeader>` is rendered, add the `widgetTitle` prop:

```tsx
<ObjectHeader
  config={config.header}
  objectId={objectId}
  widgetTitle={config.title}
/>
```

**Step 3: Run type check and Biome format**

Run: `npx tsc --noEmit && npx biome check --write src/features/object-header/ src/features/widget-shell/`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/object-header/object-header.tsx src/features/widget-shell/widget-shell.tsx
git commit -m "style: redesign object header with breadcrumbs and action icons"
```

---

### Task 9: Update TabManager Styling

**Files:**

- Modify: `src/features/tab-manager/tab-manager.tsx`

**Step 1: Update tab styling classes and fix tabs content not showing or too big space for tabs headers**

In `tab-manager.tsx`, update the Tailwind classes on `TabsList` and `TabsTrigger`:

1. `TabsList`: keep `w-full justify-start border-b rounded-none bg-transparent px-4 h-auto gap-0` — this is already enterprise-appropriate.

2. `TabsTrigger`: Update to:

```
"rounded-none border-b-2 border-transparent px-4 py-2 text-xs text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
```

Key change: add `text-muted-foreground` for inactive state and `data-[state=active]:text-primary` for active state.

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/tab-manager/tab-manager.tsx
git commit -m "style: update tab manager to enterprise PLM styling"
```

---

### Task 10: Update DataTable Enterprise Styling

**Files:**

- Modify: `src/features/data-table/data-table.tsx`
- Modify: `src/features/data-table/table-toolbar.tsx`

**Step 1: Update table header and row styles in `data-table.tsx`**

1. Table header row: change `bg-muted/50` to `bg-[#F3F4F6]`
2. Table header cells: keep `h-8 px-3 text-left font-medium text-muted-foreground` (already good)
3. Table body rows: change `hover:bg-muted/50` to `hover:bg-[#F9FAFB]`, and selected `bg-muted` to `bg-[#EFF6FF]`
4. Table body cells: keep `h-9 px-3` (close to h-8 dense — change to `h-8` for denser rows)

**Step 2: Update toolbar in `table-toolbar.tsx`**

The toolbar is already minimal. Update it to:

1. Add placeholder buttons for Add, Expand All, Collapse All, Filter, Export on the left side (as `Button variant="ghost" size="sm"` elements)
2. Move search to the right side
3. Move the totals/selected count to a footer position (or keep in toolbar but style more subtly)

Update the toolbar layout:

```tsx
<div className="flex items-center justify-between border-b border-border px-3 py-1.5">
	<div className="flex items-center gap-1">
		{config?.actions?.map((action) => (
			<Button key={action.id} variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
				{action.label}
			</Button>
		))}
	</div>

	<div className="flex items-center gap-2">
		<span className="text-[0.6875rem] text-muted-foreground">
			{totalItems} items{selectedItems > 0 && ` · ${selectedItems} selected`}
		</span>
		{config?.search !== false && (
			/* search input or toggle */
		)}
	</div>
</div>
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/features/data-table/data-table.tsx src/features/data-table/table-toolbar.tsx
git commit -m "style: update data table to enterprise data grid styling"
```

---

### Task 11: Update Details Panel Styling

**Files:**

- Modify: `src/features/side-panel/side-panel.tsx`
- Modify: `src/features/side-panel/attribute-list.tsx`

**Step 1: Update SidePanel styling**

The SidePanel currently uses a Sheet overlay. For now, keep the Sheet approach (inline conversion is a larger refactor that can be done later), but update its styling:

1. In `side-panel.tsx`: Update `SheetTitle` class to `"text-sm font-semibold text-foreground"`
2. Ensure the `ScrollArea` uses the correct height

**Step 2: Update AttributeList enterprise styling**

In `attribute-list.tsx`, update:

1. Section heading: keep `text-xs font-semibold text-muted-foreground uppercase tracking-wider` (already good)
2. Field labels: change `text-xs text-muted-foreground` (keep)
3. Field values: change `text-xs font-medium` to `text-xs font-medium text-foreground` for emphasis
4. Add a pencil icon on hover for each field row:

```tsx
<div
  key={field}
  className='group flex items-start justify-between gap-4 rounded px-1 py-0.5 hover:bg-muted/50 transition-colors'
>
  <dt className='text-xs text-muted-foreground shrink-0'>{field}</dt>
  <div className='flex items-center gap-1'>
    <dd className='text-xs font-medium text-foreground text-right truncate max-w-[200px]'>
      {value != null ? String(value) : '—'}
    </dd>
    <Pencil className='size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0' />
  </div>
</div>
```

Add Lucide `Pencil` import.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/features/side-panel/ src/features/side-panel/attribute-list.tsx
git commit -m "style: update details panel to enterprise PLM styling"
```

---

### Task 12: Final Integration and Verification

**Files:**

- Check: all modified files

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 2: Run Biome linting and formatting**

Run: `npx biome check --write src/`
Expected: All files pass

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Build check**

Run: `npm run build` or `npx vite build`
Expected: Build succeeds without errors

**Step 5: Visual verification**

Start dev server: `npm run dev`
Verify:

- [ ] App background is light gray `#F6F8FA`
- [ ] Sidebar renders on the left with "Engineering BOM" title
- [ ] Sidebar sections show "Access Your Work" and "Start a New Activity"
- [ ] "Recents" is active (blue text, light blue bg)
- [ ] Dropzone shows centered with dashed border, upload icon, "or" separator, CTA button
- [ ] Dropping an object shows the object header with breadcrumbs
- [ ] Tabs show with blue active indicator
- [ ] Data table has gray header, dense rows, hover states
- [ ] Badge colors match spec (In Work=blue, Released=green, etc.)

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete enterprise PLM dashboard UI redesign"
```

---

## Summary

| Task | Description                           | Files                                                          |
| ---- | ------------------------------------- | -------------------------------------------------------------- |
| 1    | Update theme variables                | `src/index.css`                                                |
| 2    | Update badge variant colors           | `src/components/ui/badge.tsx`                                  |
| 3    | Add sidebar config types              | `src/types/config.ts`                                          |
| 4    | Add sidebar config to engineering BOM | `src/config/widgets/engineering-bom.ts`                        |
| 5    | Create sidebar component              | `src/features/sidebar/sidebar.tsx`                             |
| 6    | Restructure WidgetShell layout        | `src/features/widget-shell/widget-shell.tsx`                   |
| 7    | Redesign dropzone                     | `src/features/drop-zone/drop-zone.tsx`                         |
| 8    | Redesign object header                | `src/features/object-header/object-header.tsx`                 |
| 9    | Update tab manager styling            | `src/features/tab-manager/tab-manager.tsx`                     |
| 10   | Update data table styling             | `src/features/data-table/data-table.tsx`, `table-toolbar.tsx`  |
| 11   | Update details panel styling          | `src/features/side-panel/side-panel.tsx`, `attribute-list.tsx` |
| 12   | Final integration and verification    | All files                                                      |

