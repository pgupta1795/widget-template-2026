# DataGrid Documentation

Welcome to the DataGrid documentation. Choose your path below:

## Quick Navigation

- **Just getting started?** → [Quick Start (5 min)](01-quick-start.md)
- **Learn by example?** → [Progressive Walkthrough](02-progressive-walkthrough.md) — watch features layer
- **Feature reference?** → [Features](#features) below
- **See all data modes?** → [Data Modes (Raw Props)](#data-modes-raw-props)
- **Config-driven approach?** → [Config & JSONata](#config-driven-tables)
- **Toolbar / commands?** → [Toolbar](08-toolbar.md)
- **Extend the grid?** → [Customization](#customization)
- **Full API?** → [API Reference](07-api-reference.md)

---

## What This DataGrid Does

The DataGrid is a headless-but-opinionated React table component for building sophisticated data experiences:

- **Local data**: Sort, filter, group, select across 10k+ rows with virtualization
- **Server-side data**: Paginated or cursor-based infinite loading
- **Hierarchical data**: Tree mode with lazy async expansion
- **Inline editing**: Optimistic mutations with error handling
- **Flexible columns**: String, number, boolean, date, select, multi-value, code types
- **Column control**: Reorder, pin, resize, hide/show

Choose your data mode (flat, paginated, infinite, tree) and feature set. Start simple, add complexity.

---

## Which Mode Should I Use?

| Mode | Best For | Example |
|------|----------|---------|
| **flat** | Local data, all rows in memory | 10k user records, client-side sort/filter |
| **paginated** | Server-driven pages | Users table, load 50/page from API |
| **infinite** | Cursor/offset based incremental load | Social feed, load more on scroll |
| **tree** | Hierarchical data, lazy children | Org chart, file explorer with async subfolders |

---

## Features

- [Sorting](03-features/sorting.md) — Click headers to sort ascending/descending/clear
- [Filtering](03-features/filtering.md) — Column-specific filters with operators
- [Selection](03-features/selection.md) — Checkbox rows, select all, track selected
- [Pinning](03-features/pinning.md) — Pin columns left/right, rows top/bottom
- [Grouping](03-features/grouping.md) — Group rows by column, expand/collapse groups
- [Editing](03-features/editing.md) — Inline edit cells, async mutations, optimistic updates
- [Tree Expansion](03-features/tree-expansion.md) — Hierarchical rows, lazy child load
- [Virtualization](03-features/virtualization.md) — Render 10k rows smoothly with row/col virtual scrolling

---

## Data Modes (Raw Props)

Full, runnable examples without config abstraction:

- [Flat Mode](04-data-modes-non-config/flat-mode.md) — Local data, all features
- [Paginated Mode](04-data-modes-non-config/paginated-mode.md) — Server-driven page loading
- [Infinite Mode](04-data-modes-non-config/infinite-mode.md) — Cursor-based incremental load
- [Tree Mode](04-data-modes-non-config/tree-mode.md) — Hierarchical rows with lazy expand

---

## Config-Driven Tables

Declarative approach using DAG (Directed Acyclic Graph) configuration + JSONata transforms:

**Getting Started:**
- [Config Basics](05-config-driven-tables/config-basics.md) — DAG model, when to use config, minimal example
- [DAG Nodes Reference](05-config-driven-tables/dag-nodes.md) — All 6 node types (api, transform, column, merge, rowExpand, action)

**JSONata & Transforms:**
- [JSONata Transforms](05-config-driven-tables/jsonata-transforms.md) — Field mapping, expressions, `$params`, `valueExpr`, `responseTransform`

**Scenarios & Examples:**
- [Flat Table Config](05-config-driven-tables/flat-table-config.md) — Local or single API data
- [Infinite Table Config](05-config-driven-tables/infinite-table-config.md) — Offset/cursor pagination + server-side search
- [Tree Table Config](05-config-driven-tables/tree-table-config.md) — Hierarchies, lazy expansion, expand-all
- [Parallel Merges](05-config-driven-tables/parallel-merge.md) — Multiple APIs in parallel, merge strategies (concat, join, merge)
- [Actions](05-config-driven-tables/actions.md) — Row/cell buttons, lazy APIs, visibility/disabled rules

**Reference:**
- [Config API Reference](05-config-driven-tables/config-api-reference.md) — Complete schema for all node types

---

## Customization

Extend the grid with your own columns, editors, features:

- [Custom Columns](06-customization/custom-columns.md) — Create column types beyond defaults
- [Custom Editors](06-customization/custom-editors.md) — Inline edit UX for your data types
- [Styling & Theming](06-customization/styling-theming.md) — CSS variables, dark mode, density
- [Custom Features](06-customization/custom-features.md) — Write feature hooks

---

## Full API Reference

[API Reference](07-api-reference.md) — DataGrid component props, column factories, types, hooks

---

## Example: Quick Start

```tsx
import { DataGrid } from "@/components/data-grid";
import { stringColumn, numberColumn } from "@/components/data-grid/columns";

const data = [
  { id: 1, name: "Alice", age: 30 },
  { id: 2, name: "Bob", age: 25 },
];

const columns = [
  stringColumn("name", "Name"),
  numberColumn("age", "Age"),
];

export default function App() {
  return <DataGrid data={data} columns={columns} mode="flat" />;
}
```

Rendered:

```
┌─────┬──────┬─────┐
│ ID  │ Name │ Age │
├─────┼──────┼─────┤
│ 1   │ Alice│ 30  │
│ 2   │ Bob  │ 25  │
└─────┴──────┴─────┘
```

Ready? Start with [Quick Start](01-quick-start.md) or [Progressive Walkthrough](02-progressive-walkthrough.md).

---

## Toolbar

A declarative, composable command bar above the grid. Supports built-in commands (search, column visibility, density, refresh, export, expand-all, add-row) and fully custom commands with handler functions.

- [Toolbar](08-toolbar.md) — Full toolbar reference: command types, ToolbarContext, built-in commands, merge behavior, server-side search, examples

---

## Architecture

The DataGrid is organized as:

- **`data-grid.tsx`** — Public component, provider setup, rendering
- **`hooks/use-data-grid.ts`** — Orchestration hook, composes all features
- **`features/`** — Modular behavior: sorting, filtering, selection, etc.
- **`columns/`** — Typed column factories
- **`editors/`** — Inline edit components
- **`toolbar/`** — Toolbar command types, renderer, built-in commands, merge utility
- **`types/`** — TypeScript contracts
- **`table-engine/`** — Config-driven engine (DAG, ConfiguredTable)

[Learn more](../../README.md) about the overall codebase structure in CLAUDE.md.

---

## Need Help?

- **How do I use this?** → [Quick Start](01-quick-start.md)
- **I need to understand features** → Pick a [feature](03-features/) or see [Progressive Walkthrough](02-progressive-walkthrough.md)
- **I want to use config** → [Config Basics](05-config-driven-tables/config-basics.md)
- **I need to customize** → [Customization](06-customization/)
- **What are all the props?** → [API Reference](07-api-reference.md)

Last updated: 2026-03-12
