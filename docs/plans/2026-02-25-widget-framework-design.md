# Widget Framework Design — Schema-Driven Registry Pattern

## Overview

Transform the TanStack Start widget template into a configuration-driven framework for building 3DEXPERIENCE dashboard widgets. New widgets are created by adding a config file — no component code needed for standard patterns.

## Architecture

### Core Principle

Everything renders from TypeScript configuration objects. A `WidgetConfig` describes: what tabs exist, what APIs each tab calls, what columns the table shows, what forms look like, what row commands are available.

### Folder Structure

```
src/
  config/
    registry.ts                    # Central registry
    endpoints/
      index.ts
      csrf.ts
      security-context.ts
      engineering-item.ts
      zone-query.ts
      relations.ts
      preferences.ts
    widgets/
      engineering-bom.ts           # Sample widget config
      index.ts
    modules.ts                     # RequireJS module config

  features/
    drop-zone/
      drop-zone.tsx
      use-object-drop.ts
    data-table/
      data-table.tsx
      table-toolbar.tsx
      table-columns.tsx
      table-commands.tsx
      use-table-data.ts
    side-panel/
      side-panel.tsx
      attribute-list.tsx
    dynamic-form/
      dynamic-form.tsx
      field-renderer.tsx
      use-form-submit.ts
    tab-manager/
      tab-manager.tsx
      admin-tab.tsx
      use-tabs.ts
    object-header/
      object-header.tsx

  services/
    query-factory.ts
    mutation-factory.ts
    request.ts
    response-mapper.ts

  types/
    config.ts                      # Core config interfaces
    (existing platform types)

  lib/
    modules/
      loader.ts
      registry.ts
    (existing widget/, hooks/, utils.ts)
```

### Type System (types/config.ts)

#### EndpointDefinition
Describes any API call: method, url, payload template, response mapping, default values, CSRF requirement, URL template params.

#### ColumnDefinition
Describes a table column: header, accessor, type (text/badge/icon/link/image/custom), sortable/filterable, optional lazy-load resolver endpoint, badge variant mapping.

#### CommandDefinition
Row-level actions: expand, side-panel, navigate, action, dialog. Each can have an endpoint and conditions for when to show.

#### FormFieldDefinition
Form field: type (text/textarea/select/combobox/number/date/toggle), validation, options (static or API-driven), dependencies.

#### FormConfig
Groups fields with a submit endpoint and mode (view/edit/create).

#### TabDefinition
A tab: label, icon, endpoint, table config, form config, or custom component name. Visibility and admin-only flags.

#### TableConfig
Columns + commands + options (selectable, expandable, pagination, default sort).

#### PanelConfig
Side panel sections with field groupings and data endpoint.

#### WidgetConfig (top-level)
id, title, icon, header config, drop zone config, tabs array, required RequireJS modules.

### Data Flow

1. User drops object → DropZone captures 3DXContent protocol data
2. Extracts objectId/objectType → calls header endpoint
3. ObjectHeader renders icon, title, state badge, metadata grid
4. TabManager renders configured tabs
5. Each tab uses query-factory to call its endpoint
6. DataTable renders columns from config; columns with resolvers fire separate queries
7. Row commands trigger side-panel / forms / navigation

### Services Layer

- **query-factory.ts**: Creates TanStack Query options from EndpointDefinition + params
- **mutation-factory.ts**: Creates mutations from EndpointDefinition
- **request.ts**: WAFData.authenticatedRequest wrapper with CSRF handling
- **response-mapper.ts**: Transforms API responses using config mapping objects

### Module Loading

Declarative config in modules.ts maps friendly keys to RequireJS paths. Widget configs declare which modules they need by key. Loader resolves and loads only required modules.

### Admin Tab

- Toggle tab visibility, reorder tabs via drag
- Persisted via widget preferences (widget.setValue/getValue)
- Always last tab, optionally restricted to admin users

### UI Direction

- Enterprise professional: clean, compact data density
- shadcn components with neutral theme
- State badges with color variants
- Side panel slides from right
- Drop zone with dashed border + hover highlight
- Matches ENOVIA Change Governance reference screens but modernized

### Sample: Engineering BOM Widget

Config file wires together:
- Header: zone query endpoint for object details
- Drop zone: enabled, accepts 3DXContent
- Tabs: Members, Proposed Changes, Realized Changes, Approvals
- Table: Title (icon), Name, Revision, Maturity State (badge), Reason for Change, Changes (icon), Change Details
- Commands: expand, view info (side panel), edit (form)
- Endpoints: CSRF, zone query, engineering item, security context

### Dependencies

- @dnd-kit/core + @dnd-kit/sortable (drag & drop)
- Existing: TanStack Query, TanStack Table, TanStack Router, React Hook Form, Zod, shadcn/Base UI, Lucide
