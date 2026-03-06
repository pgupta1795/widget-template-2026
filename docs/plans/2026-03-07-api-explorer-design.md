# API Explorer — Design Document
_Date: 2026-03-07_

## Overview

Replace the placeholder `src/app/services/` with a fully wired 3DExperience API Explorer. The explorer is a Postman-like interface that authenticates requests via the existing WAF service layer (`src/services/`), auto-resolves platform URLs, and pre-populates parameters/headers/body from the bundled OpenAPI specs.

---

## Goals

- Browse, activate, and execute 3DExperience web services from 50+ bundled OpenAPI specs
- Auto-managed authentication: CSRF via pipeline, SecurityContext pre-populated as editable query param
- OpenAPI-driven UX: path params, query params, headers, and request body pre-populated from spec
- Custom spec upload via drag-and-drop (dnd-kit)
- No duplication of `src/services/` logic — thin adapters only
- TanStack Query for all async operations

---

## Architecture — Feature Module

```
src/features/api-explorer/
├── openapi/
│   ├── types.ts              # ParsedCollection, ParsedTag, ParsedEndpoint, SchemaNode, OpenApiParameter
│   ├── parser.ts             # parseSpec(raw, filename) → ParsedCollection; resolves $refs inline
│   ├── schema-generator.ts   # OpenAPI schema → example JSON (replaces openApiParser.ts logic)
│   ├── registry.ts           # import.meta.glob('/openapi/*.json') → ParsedCollection[]
│   └── index.ts
├── platform/
│   └── url-resolver.ts       # resolveServiceUrl(type) — thin adapter over platform-resolver.ts
├── executor/
│   └── waf-executor.ts       # executeRequest(config) → ResponseData — calls httpClient.execute()
├── hooks/
│   ├── use-built-in-specs.ts # useQuery(['built-in-specs']) → ParsedCollection[]
│   ├── use-active-specs.ts   # useState + localStorage for activated spec IDs
│   ├── use-execute-request.ts# useMutation wrapping waf-executor
│   └── use-schema-panel.ts   # derives schema tree for active endpoint requestBody
├── context/
│   └── api-explorer-context.tsx  # active endpoint, params, body, response state; exposes useApiExplorer()
└── components/
    ├── api-explorer.tsx          # root layout — replaces test.tsx AppLayout
    ├── sidebar/
    │   ├── spec-browser.tsx      # built-in specs list with activate toggle + search
    │   ├── collection-tree.tsx   # file → tags → endpoints tree
    │   ├── drop-zone.tsx         # dnd-kit file drop for custom JSON/YAML specs
    │   └── history-panel.tsx
    ├── request/
    │   ├── request-panel.tsx     # URL bar + method selector + tabs
    │   ├── params-editor.tsx     # query params; SecurityContext editable pre-populated row
    │   ├── headers-editor.tsx    # headers; ENO_CSRF_TOKEN read-only row
    │   └── body-editor.tsx       # textarea + pretty-print + schema panel toggle
    ├── schema/
    │   └── schema-panel.tsx      # schema tree: name, type, description, required badge
    └── response/
        └── response-panel.tsx    # reuses existing ResponsePanel shape
```

### Dependency Rules (no cycles)

| Layer | May import |
|---|---|
| `openapi/` | nothing from this project |
| `platform/` | `src/services/core/platform-resolver.ts` only |
| `executor/` | `src/services/http/client.ts`, `src/services/types.ts` only |
| `hooks/` | `openapi/`, `platform/`, `executor/`, TanStack Query |
| `context/` | `hooks/` only |
| `components/` | `context/` only |

---

## Data Model

```ts
type ServiceType = '3DSpace' | '3DSwym' | '3DPassport' | '3DCompass';

interface ParsedCollection {
  id: string;           // derived from filename e.g. "dsdoc_v1"
  name: string;         // spec.info.title
  serviceType: ServiceType;  // from spec.info['x-ds-service'][0]
  tags: ParsedTag[];
}

interface ParsedTag {
  name: string;
  endpoints: ParsedEndpoint[];
}

interface ParsedEndpoint {
  operationId: string;
  method: HttpMethod;
  path: string;         // relative: "/resources/v1/modeler/documents/{docId}"
  summary: string;
  description: string;
  pathParams: OpenApiParameter[];   // in: 'path'
  queryParams: OpenApiParameter[];  // in: 'query' — SecurityContext included
  headers: OpenApiParameter[];      // in: 'header' — ENO_CSRF_TOKEN included
  requestBody?: OpenApiRequestBody;
  exampleBody?: string;             // pre-generated from schema
}

interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description: string;
  schema: OpenApiSchema;            // fully dereferenced (no $ref)
  enum?: string[];                  // for dropdown rendering
}
```

---

## Data Flow

### Startup — built-in spec loading
```
import.meta.glob('/openapi/*.json', { eager: true })
  → parseSpec(raw, filename) per file  (pure function, no fetch)
  → useBuiltInSpecs(): useQuery(['built-in-specs']) → ParsedCollection[]
     (cached by TanStack Query, parsed once)
```

### Endpoint selection → request execution
```
User activates spec → collection-tree shows file → tags → endpoints
User clicks endpoint
  → context.loadEndpoint(endpoint)
  → params-editor pre-fills: pathParams + queryParams
     (SecurityContext pre-populated from getSecurityContext(), editable)
  → headers-editor pre-fills: headers
     (ENO_CSRF_TOKEN shown as read-only "auto-managed")
  → body-editor pre-fills: exampleBody textarea

User edits params/body → clicks Send
  → useExecuteRequest().mutate(config)
  → waf-executor:
      1. resolveServiceUrl(collection.serviceType) → base URL
      2. substitute {pathParam} in path template
      3. httpClient.execute(method, relativeUrl, { params, headers, data })
  → pipeline: URL prepend, SecurityContext header, CSRF token, retry
  → ServiceResponse<T> → ResponsePanel
```

---

## UX Details

### Sidebar — APIs tab
- "Built-in 3DExperience APIs" accordion with search + activate toggle per spec
- "Active APIs" section below showing collection tree for activated specs only
- File drop-zone overlay (dnd-kit) for custom JSON/YAML spec upload

### Params editor
- Enum params render a Select dropdown instead of text input
- Required path params disable the Send button if empty (tooltip explains why)
- SecurityContext row: pre-populated, editable, always shown first

### Headers editor
- ENO_CSRF_TOKEN row: read-only, styled with lock icon, "auto-managed" placeholder

### Body editor
- Plain textarea with pretty-print button (formats JSON in-place)
- Schema side panel (toggleable): property tree with name, type, description, required badge
- "Copy Sample" button in schema panel

---

## Packages Added

| Package | Purpose |
|---|---|
| `openapi-types` | TypeScript types for OpenAPI 3.0 spec objects |
| `@dnd-kit/core` | Drag-and-drop file zone |
| `@dnd-kit/utilities` | dnd-kit helpers |
| `js-yaml` | Already present — YAML spec parsing |

---

## Files Deleted

- `src/app/services/apiClient.ts` — replaced by `executor/waf-executor.ts`
- `src/app/services/openApiParser.ts` — replaced by `openapi/parser.ts` + `openapi/schema-generator.ts`
- `src/app/services/codeGenerator.ts` — out of scope for this feature
- `src/app/context.tsx` — replaced by `context/api-explorer-context.tsx`
- `src/app/test.tsx` — replaced by `components/api-explorer.tsx`
- `src/app/components/` — all components migrated into `components/` sub-folders

## Files Updated

- `src/routes/index.tsx` — mounts `<ApiExplorer />` from the feature module
- `src/lib/types/api.ts` — extended with new types; legacy types kept until migration complete

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Bad spec file (parse error) | Filtered out silently; error logged; toast shown |
| Platform URL not resolved | Response panel shows "Could not resolve URL — running inside 3DDashboard?" |
| Required path param empty | Send button disabled, tooltip explains |
| CSRF expired | Pipeline auto-invalidates and retries (existing behaviour) |
| Network/WAF error | `ServiceError` mapped to `ResponseData { status: 0 }` |

---

## Out of Scope (this iteration)

- Code generation (curl/JS/Python) — `codeGenerator.ts` deleted for now, can be re-added later
- Collections save/restore — history kept, collections deferred
- Test files — deferred per user decision
