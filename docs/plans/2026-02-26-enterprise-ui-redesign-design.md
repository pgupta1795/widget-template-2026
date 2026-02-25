# Enterprise PLM Dashboard UI Redesign

**Date:** 2026-02-26
**Status:** Approved

## Overview

Complete UI redesign of the widget template to match enterprise PLM standards (ENOVIA / 3DEXPERIENCE style). Transforms the current bare-bones widget into a polished, high-density, professional dashboard with sidebar navigation, redesigned components, and a cohesive enterprise theme.

## Design System

### Color Scheme

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#F6F8FA` | App background |
| `--foreground` | `#111827` | Headings, primary text |
| `--card` | `#FFFFFF` | Cards, sidebar, panels |
| `--primary` | `#2563EB` | Blue accent, active states, CTAs |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--primary-hover` | `#1D4ED8` | Hover blue |
| `--muted` | `#F3F4F6` | Table headers, subtle backgrounds |
| `--muted-foreground` | `#6B7280` | Secondary text, labels |
| `--border` | `#E5E7EB` | Borders, dividers |
| `--sidebar` | `#FFFFFF` | Sidebar background |
| `--sidebar-primary` | `#2563EB` | Active sidebar item text |
| `--sidebar-accent` | `#EFF6FF` | Active sidebar item background |
| `--radius` | `0.375rem` | 6px, medium border radius |

### Badge Variants

| State | Style |
|-------|-------|
| In Work | Soft blue: `#DBEAFE` bg, `#1E40AF` text |
| Released | Soft green: `#DCFCE7` bg, `#166534` text |
| Frozen | Soft amber: `#FEF3C7` bg, `#92400E` text |
| Draft | Soft gray: `#F3F4F6` bg, `#374151` text |

### Typography

- Font: Geist Variable (keep existing)
- Headings: `#111827`, `font-semibold`
- Body: `text-xs` to `text-sm` (compact/dense)
- Labels: `text-xs`, `#6B7280`
- Line height: 1.5 for body

### Spacing & Styling Rules

- 8px spacing grid
- Soft shadows only (`shadow-sm`)
- No gradients, glassmorphism, or heavy borders
- Subtle separators (`1px #E5E7EB`)
- Dense tables and compact layouts

## Config System Changes

### New Types (`src/types/config.ts`)

```typescript
type SidebarItemType = "link" | "action" | "divider";

type SidebarItem = {
  id: string;
  label: string;
  icon?: string;
  type: SidebarItemType;
  view?: string;
  action?: string;
  active?: boolean;
};

type SidebarSection = {
  id: string;
  title: string;
  description?: string;
  items: SidebarItem[];
};

type SidebarConfig = {
  title: string;
  description?: string;
  sections: SidebarSection[];
  collapsible?: boolean;
  defaultWidth?: number;
};
```

### WidgetConfig Extension

```typescript
type WidgetConfig = {
  // ...existing fields...
  sidebar?: SidebarConfig;
};
```

## Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────────────────┐  │
│ │   Sidebar    │ │  Header (breadcrumbs, title,       │  │
│ │  (220px)     │ │  badge, metadata, action icons)    │  │
│ │              │ ├────────────────────────────────────┤  │
│ │  Sections    │ │  Tabs (Structure | Rel | Props)    │  │
│ │  & Items     │ ├──────────────────────┬─────────────┤  │
│ │              │ │  Data Table (70%)    │ Details     │  │
│ │              │ │  Dense rows          │ Panel (30%) │  │
│ │              │ │  Scrollable          │ Sticky      │  │
│ │              │ │                      │ Scrollable  │  │
│ └──────────────┘ └──────────────────────┴─────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- Sidebar: fixed 220px, full height, white, border-right
- Main content: flexible width
- Header: sticky top
- View 2 splits main content 70/30 (table | details panel)

## Component Designs

### 1. Sidebar (`src/features/sidebar/sidebar.tsx`)

- White background, full height, sticky, `border-r #E5E7EB`
- Header: widget title (bold) + optional description (muted)
- Sections: title in small bold text, items below
- Active item: `#2563EB` text + `#EFF6FF` bg + `2px` left blue border
- Hover: `#F3F4F6` background
- Icons: Lucide, `size-4`, `#6B7280` (active: `#2563EB`)
- Divider between sections: thin `#E5E7EB` line

### 2. DropZone (redesigned empty state)

- Centered container, `max-w-md`
- Thin dashed border `#E5E7EB`, `rounded-md`
- Minimal Upload icon, `#6B7280`
- Text: "Drop here to open" in `#6B7280`
- Thin separator "or"
- Primary CTA button: "Start with New Product"
- Hover state: `#EFF6FF` bg, `#2563EB` border
- When children present: transparent border, overlay on drag

### 3. ObjectHeader (redesigned)

- Breadcrumbs: `Home / Widget Title / Object Name` in `text-xs #6B7280`
- Title row: icon (48x48) + title (`text-base font-semibold #111827`) + maturity badge
- Metadata row: key-value pairs in `text-xs #6B7280`
- Right side: icon buttons (Search, Refresh, Settings, Help, Close)
- Bottom: `1px #E5E7EB` separator
- Background: `#FFFFFF`

### 4. TabManager (styling update)

- Background: transparent (sits on white card)
- Active tab: `#2563EB` text + `2px` bottom blue border
- Inactive: `#6B7280` text, no border
- Tab height: compact, `py-2`
- Text: `text-xs`
- Admin gear icon at right end
- Bottom `1px #E5E7EB` border on the tab strip

### 5. DataTable (enterprise data grid)

- Toolbar: Add, Expand All, Collapse All, Filter, View toggle, Export buttons + right-aligned search
- Header: `#F3F4F6` bg, `text-xs font-medium #6B7280`
- Rows: `h-8` dense, `text-xs`, horizontal borders only
- Hover: `#F9FAFB` bg
- Selected: `#EFF6FF` bg
- Tree hierarchy: expand/collapse chevrons for nested rows
- Footer: "Total Items: X | Selected: Y" in `text-xs #6B7280`

### 6. Details Panel (inline, not overlay)

- Replaces Sheet overlay with inline sticky panel
- 30% width of main content area (when visible)
- White background, `border-l #E5E7EB`
- Top: icon + title + quick action icons
- Content: scrollable, sections separated by `#E5E7EB` dividers
- Fields: label (`text-xs #6B7280`) + value (`text-sm #111827`)
- Edit icon (Pencil) per editable field
- Compact, information-dense layout

## View Routing

Sidebar items control which view renders in the main content:

| Sidebar Item | View |
|-------------|------|
| Recents | Recent object cards + dropzone empty state |
| My Products / Open | Filtered table views (placeholder initially) |
| New Product / New Part | Create action/dialog (placeholder initially) |
| Object selected | Header + Tabs + Table + Details Panel |

### State Flow

1. Widget loads → Sidebar shows, main content shows "Recents" view
2. User clicks sidebar item → Main content switches view
3. User drops object or clicks card → Transitions to object detail view
4. Object detail view shows: header + tabs (Structure/Relationships/Properties) + table/details

## Files Changed

### Modified
- `src/index.css` - Theme variables
- `src/types/config.ts` - Add SidebarConfig types
- `src/config/widgets/engineering-bom.ts` - Add sidebar configuration
- `src/features/widget-shell/widget-shell.tsx` - New layout with sidebar
- `src/features/drop-zone/drop-zone.tsx` - Redesigned styling
- `src/features/object-header/object-header.tsx` - Enterprise header with breadcrumbs
- `src/features/tab-manager/tab-manager.tsx` - Updated tab styling
- `src/features/data-table/data-table.tsx` - Enterprise data grid styling
- `src/features/side-panel/side-panel.tsx` - Inline details panel
- `src/components/ui/badge.tsx` - Updated badge variant colors

### New
- `src/features/sidebar/sidebar.tsx` - Sidebar navigation component
- `src/features/sidebar/sidebar-section.tsx` - Sidebar section component
- `src/features/sidebar/sidebar-item.tsx` - Sidebar item component
- `src/features/details-panel/details-panel.tsx` - Inline details panel (replacing Sheet-based SidePanel for View 2)

## Reference Images

- Widget1.png: Current state (bare-bones, no styling)
- Widget2.png: ENOVIA Change Governance (target reference for sidebar + cards layout)
