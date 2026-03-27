# CA Generic Row Navigation + Tabs Design

**Date:** 2026-03-26
**Status:** Approved

## Problem

Two issues block the CA detail page:

1. **`./ca-tabs.config.ts` not registered** — `ca-layout.config.ts` references it in the main panel but the file doesn't exist. The `LayoutContentRenderer` shows "Content not available".
2. **Hardcoded row navigation** — `ca.tsx` uses `row.identifier || row.nodeId || row.id`, coupling the route to a specific field name rather than reading from the config.

## Approach

**Option A (chosen):** Add `rowNavigation` to `DAGTableConfig`. The table config declares its own navigation intent; the route reads it generically. No hardcoded field names in route files.

## Design

### 1. `rowNavigation` field on `DAGTableConfig`

Add an optional field to the `DAGTableConfig` type:

```ts
rowNavigation?: {
  to: string;          // TanStack Router route pattern, e.g. "/ca/$nodeId"
  paramField: string;  // Row field whose value becomes the route param, e.g. "identifier"
  paramName: string;   // Param key in the route — required, e.g. "nodeId"
}
```

`paramName` is required (not defaulted) to avoid implicit coupling between the generic engine type and any specific feature's route parameter names.

**File:** `src/components/data-grid/table-engine/types/table.types.ts`

### 2. `ca-search.config.ts` — declare navigation

Add `rowNavigation` to the existing `caSearchConfig`:

```ts
rowNavigation: { to: "/ca/$nodeId", paramField: "identifier", paramName: "nodeId" }
```

**File:** `src/features/layouts/ca/ca-search.config.ts`

### 3. `ca.tsx` — generic `onRowClick`

Replace hardcoded field lookup with config-driven navigation:

```tsx
const nav = (listConfig as DAGTableConfig).rowNavigation;

onRowClick={(row) => {
  if (!nav) return;
  const value = row[nav.paramField];
  if (value) void navigate({ to: nav.to as any, params: { [nav.paramName]: String(value) } });
}}
```

**File:** `src/routes/ca.tsx`

### 4. `ca-tabs.config.ts` — new file

A `DAGTabConfig` with two tabs for the CA detail main panel:

| Tab | Icon | Content type | Config path |
|-----|------|-------------|-------------|
| Members | `Users` | `table` | `./ca-members.config.ts` |
| Proposed Changes | `ListChecks` | `table` | `./ca-proposed.config.ts` |

**File:** `src/features/layouts/ca/ca-tabs.config.ts`

### 5. `ca-members.config.ts` — new file

`mode: "flat"` table config. API call:
- URL: `'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId'` (JSONata expression)
- Query param: `$fields: "members"`

`responseTransform` flattens assignees, reviewers, and followers into role+name rows using `$append` chains (safe when any group is absent — `$append` treats `undefined` as empty):

```jsonata
$append($append(
  members.assignees.{"role": "Assignee", "name": $},
  members.reviewers.{"role": "Reviewer", "name": $}
), members.followers.{"role": "Follower", "name": $})
```

Columns: `role`, `name`

**File:** `src/features/layouts/ca/ca-members.config.ts`

### 6. `ca-proposed.config.ts` — new file

`mode: "flat"` table config. API call:
- URL: `'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId'` (JSONata expression)
- Query param: `$fields: "proposedChanges"`

`responseTransform` maps each proposed change. Wraps with `$type(...) = "array"` guard so the executor receives `[]` instead of `undefined` when `proposedChanges` is absent:

```jsonata
$type(proposedChanges) = "array" ? proposedChanges.{
  "status":     status,
  "type":       where.type,
  "identifier": where.identifier,
  "why":        why
} : []
```

Columns: `status` (badge), `type`, `identifier`, `why`

**File:** `src/features/layouts/ca/ca-proposed.config.ts`

### 7. `bootstrap.ts` — register new configs

Register three new keys:

```ts
registerConfig("./ca-tabs.config.ts",     caTabsConfig);
registerConfig("./ca-members.config.ts",  caMembersConfig);
registerConfig("./ca-proposed.config.ts", caProposedConfig);
```

**File:** `src/features/layouts/bootstrap.ts`

### 8. `ca-layout.config.ts` — fix stale `routePath` and file header

Two corrections:
- `routePath`: `"/xen/ca/$nodeId"` → `"/ca/$nodeId"`
- File header comment: `// src/features/xen/configs/ca-layout.config.ts` → `// src/features/layouts/ca/ca-layout.config.ts`

**File:** `src/features/layouts/ca/ca-layout.config.ts`

## Files Changed

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/types/table.types.ts` | Add `rowNavigation` to `DAGTableConfig` |
| `src/features/layouts/ca/ca-search.config.ts` | Add `rowNavigation` field |
| `src/routes/ca.tsx` | Replace hardcoded `onRowClick` with config-driven version |
| `src/features/layouts/ca/ca-tabs.config.ts` | **New** — tab config with Members + Proposed Changes |
| `src/features/layouts/ca/ca-members.config.ts` | **New** — members table config |
| `src/features/layouts/ca/ca-proposed.config.ts` | **New** — proposed changes table config |
| `src/features/layouts/bootstrap.ts` | Register 3 new configs |
| `src/features/layouts/ca/ca-layout.config.ts` | Fix stale `routePath` and file header comment |

## Out of Scope

- Wiring `rowNavigation` into `LayoutContentRenderer` (can be done later as Approach B)
- Making routes fully generic via `FeatureListRoute` (Approach C)
- Additional tabs beyond Members and Proposed Changes
