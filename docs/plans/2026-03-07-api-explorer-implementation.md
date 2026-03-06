# API Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 3DExperience API Explorer feature module at `src/features/api-explorer/` that replaces `src/app/services/` and `src/app/`, backed by the existing WAF service layer.

**Architecture:** Layered feature module — `openapi/` (pure parsing) → `platform/` (URL adapter) → `executor/` (WAF thin-wrapper) → `hooks/` (TanStack Query) → `context/` (React state) → `components/` (UI). Minimal modifications to `src/services/` (only `baseUrl` field on `ServiceConfig` to support non-3DSpace APIs). No test files in this iteration.

**Tech Stack:** React 19, TypeScript 5, TanStack Query v5, shadcn/ui, @dnd-kit/core, openapi-types, js-yaml, Tailwind CSS, Vite `import.meta.glob`

---

### Task 1: Install required packages

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install new dependencies**

```bash
npm install openapi-types @dnd-kit/core @dnd-kit/utilities
```

Expected: packages added to `node_modules` and `package.json` dependencies.

**Step 2: Verify js-yaml types are present (needed by existing openApiParser)**

```bash
npm install --save-dev @types/js-yaml
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add openapi-types, dnd-kit packages"
```

---

### Task 2: Add `baseUrl` to `ServiceConfig` + update pipeline

The `executePipeline` currently hardcodes 3DSpace URL. We need it to support `3DSwym`, `3DPassport`, and `3DCompass` too, so the API Explorer executor can create a client per service type.

**Files:**
- Modify: `src/services/types.ts` (add `baseUrl?: string` to `ServiceConfig`)
- Modify: `src/services/http/request-pipeline.ts` (use `config.baseUrl` if provided)
- Modify: `src/services/core/platform-resolver.ts` (add `get3DSpaceUrl` alias if missing)

**Step 1: Add `baseUrl` to ServiceConfig in `src/services/types.ts`**

Add after `defaultHeaders`:

```ts
/** Optional base URL override — if set, skips auto-resolving 3DSpace URL in the pipeline */
baseUrl?: string;
```

Full updated `ServiceConfig` block:

```ts
/** Global service configuration — set once at createHttpClient() */
export interface ServiceConfig {
  defaultTimeout?: number;
  retry?: RetryConfig;
  defaultHeaders?: Record<string, string>;
  /** Optional base URL override — if set, skips auto-resolving 3DSpace URL in the pipeline */
  baseUrl?: string;
}
```

**Step 2: Update `buildUrl` in `src/services/http/request-pipeline.ts`**

Change the function signature and body:

```ts
async function buildUrl(
  url: string,
  params?: Record<string, string>,
  baseUrl?: string,
): Promise<string> {
  const spaceUrl = baseUrl ?? await get3DSpaceUrl();
  const finalUrl = `${spaceUrl}/${url}`;
  if (!params || Object.keys(params).length === 0) return finalUrl;
  try {
    const u = new URL(finalUrl);
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    const qs = new URLSearchParams(params).toString();
    return `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${qs}`;
  }
}
```

In `executePipeline`, update the call to `buildUrl`:

```ts
const builtUrl = await buildUrl(url, opts.params, config.baseUrl);
```

**Step 3: Add `get3DSpaceUrl` alias to `src/services/core/platform-resolver.ts` (if not present)**

Check the file — if `get3DSpaceUrl` is not exported, add at the bottom:

```ts
/** Convenience alias used by the request pipeline */
export const get3DSpaceUrl = () => getPlatformURL('3DSpace');
```

**Step 4: Commit**

```bash
git add src/services/types.ts src/services/http/request-pipeline.ts src/services/core/platform-resolver.ts
git commit -m "feat(services): add baseUrl override to ServiceConfig for multi-platform support"
```

---

### Task 3: Create `openapi/types.ts`

**Files:**
- Create: `src/features/api-explorer/openapi/types.ts`

```ts
import type { OpenAPIV3 } from 'openapi-types';

export type ServiceType = '3DSpace' | '3DSwym' | '3DPassport' | '3DCompass';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description: string;
  schema: OpenAPIV3.SchemaObject;
  /** Populated when schema.enum is set — used to render a dropdown */
  enum?: string[];
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: OpenAPIV3.SchemaObject }>;
}

export interface ParsedEndpoint {
  operationId: string;
  method: HttpMethod;
  /** Relative path with template variables e.g. /resources/v1/modeler/documents/{docId} */
  path: string;
  summary: string;
  description: string;
  pathParams: OpenApiParameter[];
  queryParams: OpenApiParameter[];
  headers: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  /** Pre-generated JSON example string from schema, or empty string */
  exampleBody: string;
  tags: string[];
}

export interface ParsedTag {
  name: string;
  endpoints: ParsedEndpoint[];
}

export interface ParsedCollection {
  /** Derived from filename e.g. "dsdoc_v1" */
  id: string;
  /** spec.info.title e.g. "Document REST Services" */
  name: string;
  serviceType: ServiceType;
  tags: ParsedTag[];
  /** Total endpoint count across all tags */
  endpointCount: number;
  /** Original filename */
  filename: string;
}

export class OpenApiParseError extends Error {
  constructor(public readonly filename: string, reason: string) {
    super(`[${filename}] ${reason}`);
    this.name = 'OpenApiParseError';
  }
}

// Re-export OpenAPIV3 for convenience in other modules
export type { OpenAPIV3 };
```

**Step: Commit**

```bash
git add src/features/api-explorer/openapi/types.ts
git commit -m "feat(api-explorer): add openapi domain types"
```

---

### Task 4: Create `openapi/schema-generator.ts`

Migrated and improved from `src/app/services/openApiParser.ts` `generateExample` function. Accepts a fully dereferenced schema.

**Files:**
- Create: `src/features/api-explorer/openapi/schema-generator.ts`

```ts
import type { OpenAPIV3 } from 'openapi-types';

type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

/**
 * Generates a representative example JSON value from an OpenAPI schema.
 * All $refs must be resolved before calling this function.
 */
export function generateExample(schema: Schema, depth = 0): unknown {
  if (depth > 6 || !schema) return {};

  // $refs should be resolved upstream — skip unresolved ones
  if ('$ref' in schema) return {};

  const s = schema as OpenAPIV3.SchemaObject;

  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;

  if (s.allOf) {
    return s.allOf.reduce<Record<string, unknown>>(
      (acc, sub) => ({ ...acc, ...(generateExample(sub, depth + 1) as object) }),
      {},
    );
  }

  if (s.oneOf?.length) return generateExample(s.oneOf[0], depth + 1);
  if (s.anyOf?.length) return generateExample(s.anyOf[0], depth + 1);

  switch (s.type) {
    case 'string':
      if (s.enum?.length) return s.enum[0];
      if (s.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (s.format === 'email') return 'user@example.com';
      if (s.format === 'uri') return 'https://example.com';
      if (s.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      return 'string';
    case 'number':
    case 'integer':
      return s.minimum ?? 0;
    case 'boolean':
      return true;
    case 'array':
      return s.items ? [generateExample(s.items, depth + 1)] : [];
    case 'object': {
      if (!s.properties) return {};
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(s.properties)) {
        obj[key] = generateExample(prop, depth + 1);
      }
      return obj;
    }
    default:
      if (s.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(s.properties)) {
          obj[key] = generateExample(prop, depth + 1);
        }
        return obj;
      }
      return {};
  }
}

/** Builds SchemaNode tree used by the schema side panel */
export interface SchemaNode {
  name: string;
  type: string;
  description: string;
  required: boolean;
  children?: SchemaNode[];
  enum?: string[];
}

export function buildSchemaTree(
  schema: OpenAPIV3.SchemaObject,
  name = 'root',
  required = false,
  depth = 0,
): SchemaNode {
  if (depth > 6) return { name, type: '...', description: '', required };

  const type = schema.type ?? (schema.properties ? 'object' : schema.items ? 'array' : 'unknown');
  const node: SchemaNode = {
    name,
    type: schema.enum ? `enum(${schema.enum.join('|')})` : String(type),
    description: schema.description ?? '',
    required,
    enum: schema.enum as string[] | undefined,
  };

  if (schema.properties) {
    const requiredFields = new Set(schema.required ?? []);
    node.children = Object.entries(schema.properties).map(([key, prop]) => {
      if ('$ref' in prop) return { name: key, type: '$ref', description: '', required: false };
      return buildSchemaTree(prop as OpenAPIV3.SchemaObject, key, requiredFields.has(key), depth + 1);
    });
  } else if (schema.items && !('$ref' in schema.items)) {
    node.children = [buildSchemaTree(schema.items as OpenAPIV3.SchemaObject, '[item]', false, depth + 1)];
  }

  return node;
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/openapi/schema-generator.ts
git commit -m "feat(api-explorer): add schema generator and schema tree builder"
```

---

### Task 5: Create `openapi/parser.ts`

The parser fully dereferences `$ref` parameters inline, extracts service type, groups by tag, and generates example bodies.

**Files:**
- Create: `src/features/api-explorer/openapi/parser.ts`

```ts
import type { OpenAPIV3 } from 'openapi-types';
import { generateExample } from './schema-generator';
import {
  HttpMethod,
  OpenApiParseError,
  OpenApiParameter,
  OpenApiRequestBody,
  ParsedCollection,
  ParsedEndpoint,
  ParsedTag,
  ServiceType,
} from './types';

const VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DEFAULT_SERVICE_TYPE: ServiceType = '3DSpace';

/** Resolves a $ref string like "#/components/parameters/SecurityContext" from the spec */
function resolveRef<T>(ref: string, spec: OpenAPIV3.Document): T | undefined {
  const parts = ref.replace(/^#\//, '').split('/');
  let current: unknown = spec;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current as T | undefined;
}

/** Fully dereferences a parameter — follows $ref if present */
function resolveParameter(
  param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
  spec: OpenAPIV3.Document,
): OpenAPIV3.ParameterObject | undefined {
  if ('$ref' in param) {
    return resolveRef<OpenAPIV3.ParameterObject>(param.$ref, spec);
  }
  return param;
}

/** Fully dereferences a schema — follows $ref if present */
function resolveSchema(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined,
  spec: OpenAPIV3.Document,
  depth = 0,
): OpenAPIV3.SchemaObject {
  if (!schema) return {};
  if (depth > 5) return {};
  if ('$ref' in schema) {
    const resolved = resolveRef<OpenAPIV3.SchemaObject>(schema.$ref, spec);
    return resolved ? resolveSchema(resolved, spec, depth + 1) : {};
  }
  return schema;
}

function mapParameter(
  raw: OpenAPIV3.ParameterObject,
  spec: OpenAPIV3.Document,
): OpenApiParameter {
  const schema = resolveSchema(raw.schema, spec);
  return {
    name: raw.name,
    in: raw.in as 'path' | 'query' | 'header',
    required: raw.required ?? false,
    description: raw.description ?? '',
    schema,
    enum: schema.enum as string[] | undefined,
  };
}

function buildExampleBody(
  requestBody: OpenAPIV3.RequestBodyObject | undefined,
  spec: OpenAPIV3.Document,
): string {
  if (!requestBody) return '';
  const jsonContent = requestBody.content?.['application/json'];
  if (!jsonContent) return '';

  if (jsonContent.example !== undefined) {
    return JSON.stringify(jsonContent.example, null, 2);
  }

  if (jsonContent.schema) {
    const resolved = resolveSchema(jsonContent.schema, spec);
    return JSON.stringify(generateExample(resolved), null, 2);
  }

  return '';
}

function resolveRequestBody(
  raw: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined,
  spec: OpenAPIV3.Document,
): OpenApiRequestBody | undefined {
  if (!raw) return undefined;
  const resolved = ('$ref' in raw)
    ? resolveRef<OpenAPIV3.RequestBodyObject>(raw.$ref, spec)
    : raw;
  if (!resolved) return undefined;

  // Resolve schema refs inside content
  const content: OpenApiRequestBody['content'] = {};
  for (const [mime, mediaType] of Object.entries(resolved.content ?? {})) {
    content[mime] = {
      schema: mediaType.schema ? resolveSchema(mediaType.schema, spec) : undefined,
    };
  }

  return { description: resolved.description, required: resolved.required, content };
}

function extractServiceType(spec: OpenAPIV3.Document): ServiceType {
  const services: string[] = (spec.info as any)?.['x-ds-service'] ?? [];
  const first = services[0];
  if (first === '3DSpace' || first === '3DSwym' || first === '3DPassport' || first === '3DCompass') {
    return first;
  }
  return DEFAULT_SERVICE_TYPE;
}

function idFromFilename(filename: string): string {
  return filename.replace(/\.(json|yaml|yml)$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function parseSpec(raw: unknown, filename: string): ParsedCollection {
  const spec = raw as OpenAPIV3.Document;

  if (!spec || typeof spec !== 'object') {
    throw new OpenApiParseError(filename, 'Not a valid object');
  }
  if (!spec.paths) {
    throw new OpenApiParseError(filename, 'Missing "paths" — not an OpenAPI spec');
  }

  const serviceType = extractServiceType(spec);
  const title = spec.info?.title ?? filename.replace(/\.(json|yaml|yml)$/, '');
  const tagMap = new Map<string, ParsedEndpoint[]>();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!pathItem) continue;

    // Path-level parameters (shared across all methods)
    const sharedParams = (pathItem.parameters ?? [])
      .map(p => resolveParameter(p, spec))
      .filter((p): p is OpenAPIV3.ParameterObject => !!p)
      .map(p => mapParameter(p, spec));

    for (const method of VALID_METHODS) {
      const op = (pathItem as any)[method.toLowerCase()] as OpenAPIV3.OperationObject | undefined;
      if (!op) continue;

      // Merge path-level + operation-level params, operation overrides by name
      const opParams = (op.parameters ?? [])
        .map(p => resolveParameter(p, spec))
        .filter((p): p is OpenAPIV3.ParameterObject => !!p)
        .map(p => mapParameter(p, spec));

      const allParamsMap = new Map<string, OpenApiParameter>();
      for (const p of [...sharedParams, ...opParams]) {
        allParamsMap.set(`${p.in}:${p.name}`, p);
      }
      const allParams = Array.from(allParamsMap.values());

      const pathParams = allParams.filter(p => p.in === 'path');
      const queryParams = allParams.filter(p => p.in === 'query');
      const headers = allParams.filter(p => p.in === 'header');

      const requestBody = resolveRequestBody(op.requestBody, spec);
      const exampleBody = buildExampleBody(
        ('$ref' in (op.requestBody ?? {}))
          ? resolveRef((op.requestBody as any).$ref, spec)
          : op.requestBody as OpenAPIV3.RequestBodyObject | undefined,
        spec,
      );

      const tags = op.tags?.length ? op.tags : ['General'];

      const endpoint: ParsedEndpoint = {
        operationId: op.operationId ?? `${method.toLowerCase()}_${path.replace(/\//g, '_')}`,
        method,
        path,
        summary: op.summary ?? '',
        description: op.description ?? '',
        pathParams,
        queryParams,
        headers,
        requestBody,
        exampleBody,
        tags,
      };

      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(endpoint);
      }
    }
  }

  const parsedTags: ParsedTag[] = Array.from(tagMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, endpoints]) => ({ name, endpoints }));

  const endpointCount = parsedTags.reduce((sum, t) => sum + t.endpoints.length, 0);

  return {
    id: idFromFilename(filename),
    name: title,
    serviceType,
    tags: parsedTags,
    endpointCount,
    filename,
  };
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/openapi/parser.ts
git commit -m "feat(api-explorer): add OpenAPI spec parser with full \$ref resolution"
```

---

### Task 6: Create `openapi/registry.ts` and `openapi/index.ts`

Loads all bundled specs from `/openapi/*.json` at build time using `import.meta.glob`.

**Files:**
- Create: `src/features/api-explorer/openapi/registry.ts`
- Create: `src/features/api-explorer/openapi/index.ts`

**`registry.ts`:**

```ts
import { parseSpec } from './parser';
import type { ParsedCollection } from './types';

// Vite eager glob — all files bundled at build time, zero runtime fetch
const rawModules = import.meta.glob('/openapi/*.json', { eager: true }) as Record<
  string,
  { default: unknown } | unknown
>;

let _cache: ParsedCollection[] | null = null;

/**
 * Returns all successfully parsed built-in 3DExperience OpenAPI collections.
 * Bad files are silently filtered out (logged to console).
 * Result is memoized after first call.
 */
export function getBuiltInCollections(): ParsedCollection[] {
  if (_cache) return _cache;

  const results: ParsedCollection[] = [];

  for (const [filePath, module] of Object.entries(rawModules)) {
    const filename = filePath.split('/').pop() ?? filePath;
    // Vite JSON imports: value is { default: {...} } or just the object
    const raw = (module as any)?.default ?? module;

    try {
      const collection = parseSpec(raw, filename);
      results.push(collection);
    } catch (err) {
      console.warn(`[api-explorer] Skipped ${filename}:`, err);
    }
  }

  // Sort alphabetically by name
  results.sort((a, b) => a.name.localeCompare(b.name));
  _cache = results;
  return _cache;
}

/** Clears the memoized cache — for testing only */
export function _resetRegistryCache() {
  _cache = null;
}
```

**`index.ts`:**

```ts
export * from './types';
export { parseSpec } from './parser';
export { generateExample, buildSchemaTree } from './schema-generator';
export { getBuiltInCollections } from './registry';
```

**Step: Commit**

```bash
git add src/features/api-explorer/openapi/
git commit -m "feat(api-explorer): add built-in spec registry via import.meta.glob"
```

---

### Task 7: Create `platform/url-resolver.ts`

Thin adapter over `src/services/core/platform-resolver.ts`. No new logic — just re-exports with feature-module types.

**Files:**
- Create: `src/features/api-explorer/platform/url-resolver.ts`

```ts
import { getPlatformURL } from '@/services/core/platform-resolver';
import type { ServiceType } from '../openapi/types';

/**
 * Resolves the base URL for the given 3DExperience service type.
 * Delegates entirely to the platform-resolver singleton in src/services/core.
 */
export async function resolveServiceUrl(serviceType: ServiceType): Promise<string> {
  return getPlatformURL(serviceType);
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/platform/url-resolver.ts
git commit -m "feat(api-explorer): add platform URL resolver adapter"
```

---

### Task 8: Create `executor/waf-executor.ts`

Thin wrapper over `httpClient` from `src/services/http/client.ts`. Handles:
- Service type → base URL resolution
- Path param substitution in URL template
- Mapping UI `KeyValue[]` to `RequestOptions`
- Stripping leading `/` from OpenAPI path

**Files:**
- Create: `src/features/api-explorer/executor/waf-executor.ts`

```ts
import { createHttpClient } from '@/services/http/client';
import type { ServiceError } from '@/services/types';
import type { HttpMethod, ServiceType } from '../openapi/types';
import { resolveServiceUrl } from '../platform/url-resolver';

export interface ExecutorRequest {
  method: HttpMethod;
  /** OpenAPI path template e.g. /resources/v1/modeler/documents/{docId} */
  path: string;
  serviceType: ServiceType;
  /** Resolved path params — keys match {template} variables */
  pathParams: Record<string, string>;
  /** Query params (including SecurityContext if provided by user) */
  queryParams: Record<string, string>;
  /** Extra headers (ENO_CSRF_TOKEN managed by pipeline, but others pass through) */
  extraHeaders: Record<string, string>;
  /** Stringified JSON body */
  body?: string;
}

export interface ExecutorResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  time: number;
  size: number;
}

/** Substitutes {pathParam} placeholders in the path template */
function substitutePathParams(path: string, params: Record<string, string>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

/**
 * Executes a 3DExperience API request through the WAF service pipeline.
 * CSRF and SecurityContext header injection are handled automatically by the pipeline.
 */
export async function executeWafRequest(req: ExecutorRequest): Promise<ExecutorResponse> {
  const baseUrl = await resolveServiceUrl(req.serviceType);

  // Substitute path params and strip leading slash (pipeline prepends base URL with /)
  const resolvedPath = substitutePathParams(req.path, req.pathParams);
  const relativePath = resolvedPath.replace(/^\//, '');

  // Create a per-request client with the resolved base URL
  const client = createHttpClient({ baseUrl });

  const opts = {
    params: Object.keys(req.queryParams).length > 0 ? req.queryParams : undefined,
    headers: Object.keys(req.extraHeaders).length > 0 ? req.extraHeaders : undefined,
    data: req.body ?? undefined,
    type: 'json' as const,
  };

  const start = performance.now();

  try {
    const result = await client.execute(req.method, relativePath, opts);
    return {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      data: result.data,
      time: result.time,
      size: result.size,
    };
  } catch (err) {
    const time = Math.round(performance.now() - start);
    const se = err as ServiceError;
    if (se?.status) {
      return {
        status: se.status,
        statusText: se.statusText,
        headers: se.headers ?? {},
        data: se.response,
        time,
        size: 0,
      };
    }
    return {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      data: { error: (err as Error).message ?? 'Request failed' },
      time,
      size: 0,
    };
  }
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/executor/waf-executor.ts
git commit -m "feat(api-explorer): add WAF executor — thin wrapper over httpClient"
```

---

### Task 9: Create hooks

Four hooks — all using TanStack Query. No test files for this iteration.

**Files:**
- Create: `src/features/api-explorer/hooks/use-built-in-specs.ts`
- Create: `src/features/api-explorer/hooks/use-active-specs.ts`
- Create: `src/features/api-explorer/hooks/use-execute-request.ts`
- Create: `src/features/api-explorer/hooks/use-schema-panel.ts`

**`use-built-in-specs.ts`:**

```ts
import { useQuery } from '@tanstack/react-query';
import { getBuiltInCollections } from '../openapi/registry';

export function useBuiltInSpecs() {
  return useQuery({
    queryKey: ['api-explorer', 'built-in-specs'],
    queryFn: () => getBuiltInCollections(),
    staleTime: Infinity, // static — never refetch
    gcTime: Infinity,
  });
}
```

**`use-active-specs.ts`:**

```ts
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ae_active_spec_ids';

function loadActiveIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function useActiveSpecs() {
  const [activeIds, setActiveIds] = useState<Set<string>>(() => loadActiveIds());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(activeIds)));
  }, [activeIds]);

  const activate = useCallback((id: string) => {
    setActiveIds(prev => new Set([...prev, id]));
  }, []);

  const deactivate = useCallback((id: string) => {
    setActiveIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setActiveIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isActive = useCallback((id: string) => activeIds.has(id), [activeIds]);

  return { activeIds, activate, deactivate, toggle, isActive };
}
```

**`use-execute-request.ts`:**

```ts
import { useMutation } from '@tanstack/react-query';
import { executeWafRequest, type ExecutorRequest, type ExecutorResponse } from '../executor/waf-executor';

export function useExecuteRequest() {
  return useMutation<ExecutorResponse, Error, ExecutorRequest>({
    mutationFn: (req) => executeWafRequest(req),
  });
}
```

**`use-schema-panel.ts`:**

```ts
import { useMemo } from 'react';
import { buildSchemaTree, type SchemaNode } from '../openapi/schema-generator';
import type { OpenApiRequestBody } from '../openapi/types';
import type { OpenAPIV3 } from 'openapi-types';

export function useSchemaPanel(requestBody: OpenApiRequestBody | undefined): SchemaNode | null {
  return useMemo(() => {
    const schema = requestBody?.content?.['application/json']?.schema as
      | OpenAPIV3.SchemaObject
      | undefined;
    if (!schema) return null;
    return buildSchemaTree(schema, 'body', false);
  }, [requestBody]);
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/hooks/
git commit -m "feat(api-explorer): add TanStack Query hooks for specs, execution, schema panel"
```

---

### Task 10: Create `context/api-explorer-context.tsx`

Orchestrates active endpoint state, parameter editors, body, response, and history.

**Files:**
- Create: `src/features/api-explorer/context/api-explorer-context.tsx`

```tsx
import { getSecurityContext } from '@/services/core/security-context-manager';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ParsedCollection, ParsedEndpoint } from '../openapi/types';
import { useActiveSpecs } from '../hooks/use-active-specs';
import { useBuiltInSpecs } from '../hooks/use-built-in-specs';
import { useExecuteRequest } from '../hooks/use-execute-request';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  readOnly?: boolean;
  description?: string;
}

export interface HistoryEntry {
  id: string;
  method: string;
  path: string;
  serviceType: string;
  timestamp: number;
  status?: number;
  time?: number;
}

export interface ResponseState {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  time: number;
  size: number;
}

const newKv = (key = '', value = '', readOnly = false, description = ''): KeyValue => ({
  id: crypto.randomUUID(), key, value, enabled: true, readOnly, description,
});

const HISTORY_KEY = 'ae_history';

function loadHistory(): HistoryEntry[] {
  try {
    const s = localStorage.getItem(HISTORY_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

interface ApiExplorerContextType {
  // Built-in specs
  builtInCollections: ParsedCollection[];
  builtInLoading: boolean;
  // Custom (dropped) collections
  customCollections: ParsedCollection[];
  addCustomCollection: (col: ParsedCollection) => void;
  removeCustomCollection: (id: string) => void;
  // Active spec management
  activeIds: Set<string>;
  toggleActive: (id: string) => void;
  isActive: (id: string) => boolean;
  // Active collections (built-in + custom that are activated)
  activeCollections: ParsedCollection[];
  // Active endpoint
  activeEndpoint: ParsedEndpoint | null;
  activeCollection: ParsedCollection | null;
  loadEndpoint: (collection: ParsedCollection, endpoint: ParsedEndpoint) => void;
  // Request editor state
  pathParams: KeyValue[];
  setPathParams: (v: KeyValue[]) => void;
  queryParams: KeyValue[];
  setQueryParams: (v: KeyValue[]) => void;
  headers: KeyValue[];
  setHeaders: (v: KeyValue[]) => void;
  body: string;
  setBody: (v: string) => void;
  // Execute
  sendRequest: () => void;
  loading: boolean;
  response: ResponseState | null;
  // History
  history: HistoryEntry[];
  clearHistory: () => void;
  loadHistoryEntry: (entry: HistoryEntry) => void;
}

const ApiExplorerContext = createContext<ApiExplorerContextType | null>(null);

export function useApiExplorer() {
  const ctx = useContext(ApiExplorerContext);
  if (!ctx) throw new Error('useApiExplorer must be used within ApiExplorerProvider');
  return ctx;
}

export function ApiExplorerProvider({ children }: { children: ReactNode }) {
  const { data: builtInCollections = [], isLoading: builtInLoading } = useBuiltInSpecs();
  const { activeIds, toggle: toggleActive, isActive } = useActiveSpecs();
  const executeMutation = useExecuteRequest();

  const [customCollections, setCustomCollections] = useState<ParsedCollection[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<ParsedEndpoint | null>(null);
  const [activeCollection, setActiveCollection] = useState<ParsedCollection | null>(null);
  const [pathParams, setPathParams] = useState<KeyValue[]>([]);
  const [queryParams, setQueryParams] = useState<KeyValue[]>([newKv()]);
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const allCollections = [...builtInCollections, ...customCollections];
  const activeCollections = allCollections.filter(c => activeIds.has(c.id));

  const addCustomCollection = useCallback((col: ParsedCollection) => {
    setCustomCollections(prev => {
      const filtered = prev.filter(c => c.id !== col.id);
      return [...filtered, col];
    });
    // Auto-activate custom collections
    if (!activeIds.has(col.id)) toggleActive(col.id);
  }, [activeIds, toggleActive]);

  const removeCustomCollection = useCallback((id: string) => {
    setCustomCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  const loadEndpoint = useCallback((collection: ParsedCollection, endpoint: ParsedEndpoint) => {
    setActiveEndpoint(endpoint);
    setActiveCollection(collection);
    setResponse(null);
    setBody(endpoint.exampleBody ?? '');

    // Path params
    setPathParams(
      endpoint.pathParams.map(p => newKv(p.name, '', false, p.description)),
    );

    // Query params: SecurityContext pre-populated from platform, then other params
    const sc = getSecurityContext() ?? '';
    const scParam = endpoint.queryParams.find(p => p.name === 'SecurityContext');
    const otherParams = endpoint.queryParams.filter(p => p.name !== 'SecurityContext');

    const qParams: KeyValue[] = [];
    if (scParam !== undefined) {
      qParams.push(newKv('SecurityContext', sc, false, 'Platform security context (editable)'));
    }
    for (const p of otherParams) {
      qParams.push(newKv(p.name, p.enum?.[0] ?? '', false, p.description));
    }
    if (qParams.length === 0) qParams.push(newKv());
    setQueryParams(qParams);

    // Headers: ENO_CSRF_TOKEN is read-only, plus other headers
    const hParams: KeyValue[] = [];
    for (const h of endpoint.headers) {
      if (h.name === 'ENO_CSRF_TOKEN') {
        hParams.push({ ...newKv('ENO_CSRF_TOKEN', '', true, 'Auto-managed by WAF pipeline'), readOnly: true });
      } else {
        hParams.push(newKv(h.name, '', false, h.description));
      }
    }
    // Always show ENO_CSRF_TOKEN even if not in spec
    if (!hParams.some(h => h.key === 'ENO_CSRF_TOKEN')) {
      hParams.unshift({ ...newKv('ENO_CSRF_TOKEN', '', true, 'Auto-managed by WAF pipeline'), readOnly: true });
    }
    setHeaders(hParams);
  }, []);

  const sendRequest = useCallback(() => {
    if (!activeEndpoint || !activeCollection) return;

    const pParams: Record<string, string> = {};
    for (const p of pathParams) {
      if (p.key) pParams[p.key] = p.value;
    }

    const qParams: Record<string, string> = {};
    for (const p of queryParams) {
      if (p.enabled && p.key && p.key !== 'ENO_CSRF_TOKEN') qParams[p.key] = p.value;
    }

    const extraHeaders: Record<string, string> = {};
    for (const h of headers) {
      if (h.enabled && h.key && !h.readOnly) extraHeaders[h.key] = h.value;
    }

    setResponse(null);
    executeMutation.mutate(
      {
        method: activeEndpoint.method,
        path: activeEndpoint.path,
        serviceType: activeCollection.serviceType,
        pathParams: pParams,
        queryParams: qParams,
        extraHeaders,
        body: body.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          setResponse(res);
          setHistory(prev => [{
            id: crypto.randomUUID(),
            method: activeEndpoint.method,
            path: activeEndpoint.path,
            serviceType: activeCollection.serviceType,
            timestamp: Date.now(),
            status: res.status,
            time: res.time,
          }, ...prev].slice(0, 100));
        },
        onError: (err) => {
          setResponse({ status: 0, statusText: 'Error', headers: {}, data: { error: err.message }, time: 0, size: 0 });
        },
      },
    );
  }, [activeEndpoint, activeCollection, pathParams, queryParams, headers, body, executeMutation]);

  const clearHistory = useCallback(() => setHistory([]), []);

  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    // Find matching endpoint across all collections and load it
    for (const col of allCollections) {
      for (const tag of col.tags) {
        const ep = tag.endpoints.find(
          e => e.path === entry.path && e.method === entry.method,
        );
        if (ep) { loadEndpoint(col, ep); return; }
      }
    }
  }, [allCollections, loadEndpoint]);

  return (
    <ApiExplorerContext.Provider value={{
      builtInCollections, builtInLoading,
      customCollections, addCustomCollection, removeCustomCollection,
      activeIds, toggleActive, isActive,
      activeCollections,
      activeEndpoint, activeCollection, loadEndpoint,
      pathParams, setPathParams,
      queryParams, setQueryParams,
      headers, setHeaders,
      body, setBody,
      sendRequest, loading: executeMutation.isPending, response,
      history, clearHistory, loadHistoryEntry,
    }}>
      {children}
    </ApiExplorerContext.Provider>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/context/api-explorer-context.tsx
git commit -m "feat(api-explorer): add ApiExplorer context with endpoint loading and execution"
```

---

### Task 11: Create `components/response/response-panel.tsx`

Migrated from `src/app/components/response-panel.tsx` — same logic, wired to new context.

**Files:**
- Create: `src/features/api-explorer/components/response/response-panel.tsx`

Migrate the existing `src/app/components/response-panel.tsx` content verbatim, changing only the import:

```ts
// Change this:
import { useApp } from '@/app/context';
// To this:
import { useApiExplorer } from '../../context/api-explorer-context';
// And change useApp() to useApiExplorer()
```

The `response` and `loading` fields have the same shape — no other changes needed.

**Step: Commit**

```bash
git add src/features/api-explorer/components/response/response-panel.tsx
git commit -m "feat(api-explorer): migrate response panel to feature module"
```

---

### Task 12: Create `components/schema/schema-panel.tsx`

Renders the schema tree alongside the body editor. Accepts a `SchemaNode` root and recursively renders it.

**Files:**
- Create: `src/features/api-explorer/components/schema/schema-panel.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SchemaNode } from '../../openapi/schema-generator';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function SchemaNodeRow({ node, depth = 0 }: { node: SchemaNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-start gap-1.5 py-0.5 pr-2 rounded-sm text-xs hover:bg-muted/40 transition-colors cursor-default ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        <span className="shrink-0 w-3 mt-0.5">
          {hasChildren ? (
            open ? <ChevronDown size={11} /> : <ChevronRight size={11} />
          ) : null}
        </span>
        <span className="font-mono text-foreground/90 font-medium">{node.name}</span>
        <span className="text-muted-foreground/70 ml-0.5">{node.type}</span>
        {node.required && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-destructive/40 text-destructive ml-0.5">
            req
          </Badge>
        )}
        {node.description && (
          <span className="text-muted-foreground/50 truncate max-w-32 ml-1 hidden md:inline">
            {node.description}
          </span>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((child, i) => (
            <SchemaNodeRow key={`${child.name}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  root: SchemaNode;
  exampleBody: string;
  onCopySample: () => void;
}

export function SchemaPanel({ root, exampleBody, onCopySample }: Props) {
  return (
    <div className="flex flex-col h-full border-l border-border w-56 shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">{root.name}</span>
        <button
          onClick={onCopySample}
          disabled={!exampleBody}
          className="text-[10px] text-primary hover:text-primary/80 disabled:text-muted-foreground/40 transition-colors"
        >
          Copy sample
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {root.children?.map((child, i) => (
            <SchemaNodeRow key={`${child.name}-${i}`} node={child} depth={0} />
          )) ?? <SchemaNodeRow node={root} depth={0} />}
        </div>
        <div className="px-3 py-2 mt-1 border-t border-border/50">
          <span className="text-[9px] text-muted-foreground/50">
            <span className="text-destructive">req</span> = required field
          </span>
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/schema/schema-panel.tsx
git commit -m "feat(api-explorer): add collapsible schema reference panel"
```

---

### Task 13: Create `components/request/params-editor.tsx` and `headers-editor.tsx`

Enhanced key-value editors. `params-editor` supports enum dropdowns. `headers-editor` shows read-only rows for auto-managed headers.

**Files:**
- Create: `src/features/api-explorer/components/request/params-editor.tsx`
- Create: `src/features/api-explorer/components/request/headers-editor.tsx`

**`params-editor.tsx`:**

```tsx
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { KeyValue } from '../../context/api-explorer-context';
import type { OpenApiParameter } from '../../openapi/types';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  /** Optional schema hints from OpenAPI — used to render enum dropdowns */
  paramHints?: OpenApiParameter[];
  label?: string;
}

export function ParamsEditor({ items, onChange, paramHints = [], label = 'Param' }: Props) {
  const update = (id: string, field: keyof KeyValue, value: any) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const add = () => {
    onChange([...items, { id: crypto.randomUUID(), key: '', value: '', enabled: true }]);
  };

  const remove = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    onChange(filtered.length === 0 ? [{ id: crypto.randomUUID(), key: '', value: '', enabled: true }] : filtered);
  };

  return (
    <div className="space-y-1.5 p-3">
      <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
        <span />
        <span>{label}</span>
        <span>Value</span>
        <span />
      </div>
      {items.map(item => {
        const hint = paramHints.find(h => h.name === item.key);
        const hasEnum = hint?.enum && hint.enum.length > 0;
        return (
          <div key={item.id} className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center">
            <Checkbox
              checked={item.enabled}
              onCheckedChange={(checked) => update(item.id, 'enabled', checked === true)}
              className="flex self-center mx-auto"
            />
            <Input
              placeholder="key"
              value={item.key}
              onChange={e => update(item.id, 'key', e.target.value)}
              className="h-8 font-mono bg-card text-xs"
              title={item.description}
            />
            {hasEnum ? (
              <Select
                value={item.value || hint!.enum![0]}
                onValueChange={val => update(item.id, 'value', val)}
              >
                <SelectTrigger className="h-8 font-mono bg-card text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hint!.enum!.map(opt => (
                    <SelectItem key={opt} value={opt} className="font-mono text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="value"
                value={item.value}
                onChange={e => update(item.id, 'value', e.target.value)}
                className="h-8 font-mono bg-card text-xs"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(item.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={add}
        className="flex h-8 px-2 items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mt-2 transition-colors"
      >
        <Plus size={14} /> Add row
      </Button>
    </div>
  );
}
```

**`headers-editor.tsx`:**

```tsx
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Lock, Plus, Trash2 } from 'lucide-react';
import type { KeyValue } from '../../context/api-explorer-context';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
}

export function HeadersEditor({ items, onChange }: Props) {
  const update = (id: string, field: keyof KeyValue, value: any) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const add = () => {
    onChange([...items, { id: crypto.randomUUID(), key: '', value: '', enabled: true }]);
  };

  const remove = (id: string) => {
    // Don't allow removing read-only rows
    const item = items.find(i => i.id === id);
    if (item?.readOnly) return;
    const filtered = items.filter(item => item.id !== id);
    onChange(filtered);
  };

  return (
    <div className="space-y-1.5 p-3">
      <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
        <span />
        <span>Header</span>
        <span>Value</span>
        <span />
      </div>
      {items.map(item => (
        <div
          key={item.id}
          className={`grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center ${
            item.readOnly ? 'opacity-60' : ''
          }`}
        >
          {item.readOnly ? (
            <Lock size={12} className="mx-auto text-muted-foreground" />
          ) : (
            <Checkbox
              checked={item.enabled}
              onCheckedChange={(checked) => update(item.id, 'enabled', checked === true)}
              className="flex self-center mx-auto"
            />
          )}
          <Input
            value={item.key}
            readOnly={item.readOnly}
            className={`h-8 font-mono text-xs ${item.readOnly ? 'bg-muted/30 cursor-not-allowed' : 'bg-card'}`}
            title={item.description}
          />
          <Input
            value={item.readOnly ? 'auto-managed' : item.value}
            readOnly={item.readOnly}
            placeholder={item.readOnly ? undefined : 'value'}
            onChange={e => !item.readOnly && update(item.id, 'value', e.target.value)}
            className={`h-8 font-mono text-xs ${
              item.readOnly ? 'bg-muted/30 cursor-not-allowed text-muted-foreground italic' : 'bg-card'
            }`}
          />
          {item.readOnly ? (
            <span />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(item.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={add}
        className="flex h-8 px-2 items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mt-2 transition-colors"
      >
        <Plus size={14} /> Add row
      </Button>
    </div>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/request/params-editor.tsx src/features/api-explorer/components/request/headers-editor.tsx
git commit -m "feat(api-explorer): add params editor with enum dropdowns and headers editor with read-only rows"
```

---

### Task 14: Create `components/request/body-editor.tsx`

Textarea with pretty-print button and toggleable schema side panel.

**Files:**
- Create: `src/features/api-explorer/components/request/body-editor.tsx`

```tsx
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlignLeft, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useState } from 'react';
import { useApiExplorer } from '../../context/api-explorer-context';
import { useSchemaPanel } from '../../hooks/use-schema-panel';
import { SchemaPanel } from '../schema/schema-panel';

export function BodyEditor() {
  const { body, setBody, activeEndpoint } = useApiExplorer();
  const [showSchema, setShowSchema] = useState(true);
  const schemaRoot = useSchemaPanel(activeEndpoint?.requestBody);

  const prettyPrint = () => {
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      // Not valid JSON — leave as-is
    }
  };

  const copyToClipboard = () => {
    if (activeEndpoint?.exampleBody) {
      navigator.clipboard.writeText(activeEndpoint.exampleBody);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Body toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground">JSON</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={prettyPrint}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="Pretty print JSON"
          >
            <AlignLeft size={12} />
            Format
          </Button>
          {schemaRoot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSchema(v => !v)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title={showSchema ? 'Hide schema' : 'Show schema'}
            >
              {showSchema ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
              Schema
            </Button>
          )}
        </div>
      </div>

      {/* Editor + schema panel */}
      <div className="flex flex-1 overflow-hidden">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={'{\n  "key": "value"\n}'}
          className="flex-1 resize-none rounded-none border-0 font-mono text-xs p-3 focus-visible:ring-0 h-full"
          spellCheck={false}
        />
        {schemaRoot && showSchema && (
          <SchemaPanel
            root={schemaRoot}
            exampleBody={activeEndpoint?.exampleBody ?? ''}
            onCopySample={copyToClipboard}
          />
        )}
      </div>
    </div>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/request/body-editor.tsx
git commit -m "feat(api-explorer): add body editor with pretty-print and schema side panel"
```

---

### Task 15: Create `components/request/request-panel.tsx`

Rewired to use `useApiExplorer`. Shows method, path (read-only when loaded from spec), tabs for Path Params / Query Params / Headers / Body.

**Files:**
- Create: `src/features/api-explorer/components/request/method-badge.tsx` (migrate from app)
- Create: `src/features/api-explorer/components/request/request-panel.tsx`

**`method-badge.tsx`** — copy from `src/app/components/method-badge.tsx` verbatim (no import changes needed).

**`request-panel.tsx`:**

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { useApiExplorer } from '../../context/api-explorer-context';
import { BodyEditor } from './body-editor';
import { HeadersEditor } from './headers-editor';
import { MethodBadge } from './method-badge';
import { ParamsEditor } from './params-editor';

type RequestTab = 'path' | 'query' | 'headers' | 'body';

import { useState } from 'react';

export function RequestPanel() {
  const {
    activeEndpoint, activeCollection,
    pathParams, setPathParams,
    queryParams, setQueryParams,
    headers, setHeaders,
    loading, sendRequest,
  } = useApiExplorer();

  const [activeTab, setActiveTab] = useState<RequestTab>('query');

  // Disable send if any required path param is missing
  const missingRequired = pathParams.some(p => {
    const hint = activeEndpoint?.pathParams.find(h => h.name === p.key);
    return hint?.required && !p.value.trim();
  });

  const canSend = !!activeEndpoint && !loading && !missingRequired;

  const tabs = [
    { id: 'path' as const, label: 'Path Params', count: pathParams.filter(p => p.value).length, show: pathParams.length > 0 },
    { id: 'query' as const, label: 'Query Params', count: queryParams.filter(p => p.key && p.enabled).length, show: true },
    { id: 'headers' as const, label: 'Headers', count: headers.filter(p => p.key && p.enabled && !p.readOnly).length, show: true },
    { id: 'body' as const, label: 'Body', count: 0, show: ['POST', 'PUT', 'PATCH'].includes(activeEndpoint?.method ?? '') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        {activeEndpoint ? (
          <MethodBadge method={activeEndpoint.method} className="shrink-0" />
        ) : (
          <span className="text-xs font-mono text-muted-foreground px-2 py-1.5 bg-muted/30 rounded-md">GET</span>
        )}

        <div className="flex-1 relative">
          <Input
            readOnly
            value={activeEndpoint
              ? `${activeCollection?.serviceType ?? ''} · ${activeEndpoint.path}`
              : ''}
            placeholder="Select an endpoint from the sidebar"
            className="h-9 font-mono text-xs bg-muted/20 pr-4"
          />
        </div>

        <Button
          onClick={sendRequest}
          disabled={!canSend}
          className="h-9 px-5 gap-2 font-semibold shrink-0"
          title={missingRequired ? 'Fill in required path parameters' : ''}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
          Send
        </Button>
      </div>

      {/* Endpoint description */}
      {activeEndpoint?.description && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-muted/10 line-clamp-2">
          {activeEndpoint.description}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {tabs.filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'path' && (
          <ParamsEditor
            items={pathParams}
            onChange={setPathParams}
            paramHints={activeEndpoint?.pathParams}
            label="Path Param"
          />
        )}
        {activeTab === 'query' && (
          <ParamsEditor
            items={queryParams}
            onChange={setQueryParams}
            paramHints={activeEndpoint?.queryParams}
            label="Query Param"
          />
        )}
        {activeTab === 'headers' && (
          <HeadersEditor items={headers} onChange={setHeaders} />
        )}
        {activeTab === 'body' && <BodyEditor />}
      </div>
    </div>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/request/
git commit -m "feat(api-explorer): add request panel with method, path params, query params, headers, body tabs"
```

---

### Task 16: Create sidebar components

**Files:**
- Create: `src/features/api-explorer/components/sidebar/history-panel.tsx`
- Create: `src/features/api-explorer/components/sidebar/collection-tree.tsx`

**`history-panel.tsx`** — Migrate from `src/app/components/app-sidebar.tsx` history tab section. Change `useApp` → `useApiExplorer`, adjust `HistoryEntry` fields (`path` instead of `url`):

```tsx
import { useApiExplorer } from '../../context/api-explorer-context';
import { Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MethodBadge } from '../request/method-badge';
import type { HttpMethod } from '../../openapi/types';

export function HistoryPanel() {
  const { history, clearHistory, loadHistoryEntry } = useApiExplorer();

  if (history.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Clock size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Your request history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-1">
      <div className="flex justify-end mb-2 px-2">
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <Trash2 size={10} /> Clear all
        </button>
      </div>
      {history.map(entry => (
        <button
          key={entry.id}
          onClick={() => loadHistoryEntry(entry)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent text-xs group transition-colors"
        >
          <MethodBadge method={entry.method as HttpMethod} className="text-[10px] w-10 text-left shrink-0" />
          <span className="flex-1 text-left truncate font-mono text-sidebar-foreground/80 text-[11px]">
            {entry.path}
          </span>
          <div className="flex flex-col items-end shrink-0">
            {entry.status && (
              <span className={`text-[10px] font-mono leading-none ${
                entry.status < 300 ? 'text-green-500' : entry.status < 500 ? 'text-yellow-500' : 'text-destructive'
              }`}>
                {entry.status}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground/70 leading-none mt-1">
              {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

**`collection-tree.tsx`** — File → Tags → Endpoints tree:

```tsx
import { useApiExplorer } from '../../context/api-explorer-context';
import { MethodBadge } from '../request/method-badge';
import type { ParsedCollection, ParsedEndpoint, ParsedTag } from '../../openapi/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function TagGroup({
  tag,
  collection,
  onSelect,
  activeEndpointId,
}: {
  tag: ParsedTag;
  collection: ParsedCollection;
  onSelect: (col: ParsedCollection, ep: ParsedEndpoint) => void;
  activeEndpointId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="truncate font-medium">{tag.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50">{tag.endpoints.length}</span>
      </button>
      {open && (
        <div className="ml-3 border-l border-sidebar-border/40 pl-1 space-y-0.5">
          {tag.endpoints.map(ep => (
            <button
              key={ep.operationId}
              onClick={() => onSelect(collection, ep)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group ${
                activeEndpointId === ep.operationId
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent'
              }`}
            >
              <MethodBadge method={ep.method} className="w-12 text-[10px] shrink-0" />
              <span className="flex-1 text-left truncate font-mono text-sidebar-foreground/80 text-[11px]">
                {ep.path}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionTree() {
  const { activeCollections, loadEndpoint, activeEndpoint } = useApiExplorer();
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (activeCollections.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <p className="text-xs text-muted-foreground">Activate APIs from the browser above to see endpoints</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activeCollections.map(col => (
        <div key={col.id}>
          <button
            onClick={() => toggleCollection(col.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-sm group"
          >
            {expandedCollections.has(col.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="flex-1 text-left truncate text-sidebar-foreground font-medium text-xs">
              {col.name}
            </span>
            <span className="text-[9px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded shrink-0">
              {col.serviceType}
            </span>
            <span className="text-[9px] text-muted-foreground/40 ml-1">{col.endpointCount}</span>
          </button>
          {expandedCollections.has(col.id) && (
            <div className="ml-2 mt-0.5 space-y-0.5">
              {col.tags.map(tag => (
                <TagGroup
                  key={tag.name}
                  tag={tag}
                  collection={col}
                  onSelect={loadEndpoint}
                  activeEndpointId={activeEndpoint?.operationId}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/sidebar/history-panel.tsx src/features/api-explorer/components/sidebar/collection-tree.tsx
git commit -m "feat(api-explorer): add history panel and collection tree (file → tags → endpoints)"
```

---

### Task 17: Create `components/sidebar/spec-browser.tsx`

Built-in APIs browser with search + activate toggle per spec.

**Files:**
- Create: `src/features/api-explorer/components/sidebar/spec-browser.tsx`

```tsx
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useApiExplorer } from '../../context/api-explorer-context';

export function SpecBrowser() {
  const { builtInCollections, customCollections, builtInLoading, toggleActive, isActive } = useApiExplorer();
  const [search, setSearch] = useState('');

  const allCollections = [...builtInCollections, ...customCollections];
  const filtered = allCollections.filter(
    c => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (builtInLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative px-2">
        <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search APIs..."
          className="h-7 pl-7 text-xs"
        />
      </div>

      {/* List */}
      <div className="space-y-0.5">
        {filtered.map(col => (
          <div
            key={col.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{col.name}</p>
              <p className="text-[10px] text-muted-foreground/60">
                {col.serviceType} · {col.endpointCount} endpoints
              </p>
            </div>
            <Switch
              checked={isActive(col.id)}
              onCheckedChange={() => toggleActive(col.id)}
              className="shrink-0 scale-75"
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No APIs match your search</p>
        )}
      </div>
    </div>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/sidebar/spec-browser.tsx
git commit -m "feat(api-explorer): add built-in spec browser with search and activate toggle"
```

---

### Task 18: Create `components/sidebar/drop-zone.tsx`

Full-screen drop overlay using HTML5 drag-and-drop events wrapped with `@dnd-kit/utilities` helpers. Parses dropped files via the existing `parseSpec` function and adds them as custom collections.

**Files:**
- Create: `src/features/api-explorer/components/sidebar/drop-zone.tsx`

```tsx
import { parseSpec } from '../../openapi/parser';
import { useApiExplorer } from '../../context/api-explorer-context';
import { FileJson, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import yaml from 'js-yaml';

export function DropZone() {
  const { addCustomCollection } = useApiExplorer();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const processFile = useCallback((content: string, filename: string) => {
    let raw: unknown;
    try {
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        raw = yaml.load(content);
      } else {
        raw = JSON.parse(content);
      }
    } catch {
      toast.error(`${filename}: invalid JSON/YAML`);
      return;
    }

    try {
      const collection = parseSpec(raw, filename);
      addCustomCollection(collection);
      toast.success(`Imported ${collection.name} (${collection.endpointCount} endpoints)`);
    } catch (err: any) {
      toast.error(`${filename}: ${err.message}`);
    }
  }, [addCustomCollection]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    Array.from(e.dataTransfer.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => processFile(ev.target?.result as string, file.name);
      reader.readAsText(file);
    });
  }, [processFile]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
      />
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-primary rounded-2xl p-16 flex flex-col items-center gap-4 bg-card/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Drop OpenAPI spec file</p>
              <p className="text-sm text-muted-foreground mt-1">Supports JSON and YAML formats</p>
            </div>
            <div className="flex gap-2 mt-2">
              {['.json', '.yaml', '.yml'].map(ext => (
                <span key={ext} className="flex items-center gap-1 px-2 py-1 bg-input rounded text-xs text-muted-foreground">
                  <FileJson size={12} /> {ext}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/sidebar/drop-zone.tsx
git commit -m "feat(api-explorer): add file drop zone for custom OpenAPI spec import"
```

---

### Task 19: Create `components/api-explorer.tsx`

Root layout — replaces `src/app/test.tsx`. Assembles sidebar, request panel, response panel.

**Files:**
- Create: `src/features/api-explorer/components/api-explorer.tsx`
- Create: `src/features/api-explorer/index.ts`

**`api-explorer.tsx`:**

```tsx
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Clock, Globe } from 'lucide-react';
import { useState } from 'react';
import { ApiExplorerProvider } from '../context/api-explorer-context';
import { CollectionTree } from './sidebar/collection-tree';
import { DropZone } from './sidebar/drop-zone';
import { HistoryPanel } from './sidebar/history-panel';
import { SpecBrowser } from './sidebar/spec-browser';
import { RequestPanel } from './request/request-panel';
import { ResponsePanel } from './response/response-panel';
import { Separator } from '@/components/ui/separator';

type SidebarTab = 'apis' | 'history';

function ExplorerSidebar() {
  const [tab, setTab] = useState<SidebarTab>('apis');

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-0">
        <div className="flex items-center px-4 h-12 shrink-0">
          <span className="font-semibold text-sm text-foreground tracking-tight">3DX API Explorer</span>
        </div>
        <div className="flex border-t border-border">
          {([
            ['apis', Globe, 'APIs'],
            ['history', Clock, 'History'],
          ] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {tab === 'apis' && (
          <SidebarGroup>
            <SidebarGroupContent className="space-y-3 pt-2">
              {/* Built-in spec browser */}
              <div>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Browse 3DExperience APIs
                </p>
                <SpecBrowser />
              </div>

              <Separator />

              {/* Active collections tree */}
              <div>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Active APIs
                </p>
                <CollectionTree />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {tab === 'history' && (
          <SidebarGroup>
            <SidebarGroupContent>
              <HistoryPanel />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function ExplorerLayout() {
  return (
    <SidebarProvider className="h-screen overflow-hidden bg-background">
      <DropZone />
      <ExplorerSidebar />
      <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        <div className="flex items-center px-4 h-10 border-b border-border shrink-0 bg-card/50">
          <SidebarTrigger className="-ml-2" />
        </div>
        <ResizablePanelGroup orientation="vertical" className="flex-1">
          <ResizablePanel defaultSize={55} minSize={25}>
            <RequestPanel />
          </ResizablePanel>
          <ResizableHandle className="bg-border hover:bg-primary/30 transition-colors data-resize-handle-active:bg-primary/50" />
          <ResizablePanel defaultSize={45} minSize={20}>
            <ResponsePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function ApiExplorer() {
  return (
    <ApiExplorerProvider>
      <ExplorerLayout />
    </ApiExplorerProvider>
  );
}
```

**`src/features/api-explorer/index.ts`:**

```ts
export { ApiExplorer } from './components/api-explorer';
export { useApiExplorer } from './context/api-explorer-context';
```

**Step: Commit**

```bash
git add src/features/api-explorer/components/api-explorer.tsx src/features/api-explorer/index.ts
git commit -m "feat(api-explorer): add root layout and feature barrel export"
```

---

### Task 20: Wire up `src/routes/index.tsx`

**Files:**
- Modify: `src/routes/index.tsx`

Replace the entire file with:

```tsx
import { ApiExplorer } from '@/features/api-explorer';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ component: ApiExplorer });
```

**Step: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: wire API Explorer to root route"
```

---

### Task 21: Delete placeholder `src/app/` files

Now that all components are migrated, delete the old placeholder.

**Files to delete:**
- `src/app/services/apiClient.ts`
- `src/app/services/openApiParser.ts`
- `src/app/services/codeGenerator.ts`
- `src/app/context.tsx`
- `src/app/test.tsx`
- `src/app/components/app-sidebar.tsx`
- `src/app/components/dropzone.tsx`
- `src/app/components/env-dialog.tsx`
- `src/app/components/keyvalue-editor.tsx`
- `src/app/components/method-badge.tsx`
- `src/app/components/request-panel.tsx`
- `src/app/components/response-panel.tsx`

```bash
rm -rf src/app/
```

Then check if `src/lib/types/api.ts` has any types now ONLY used by deleted files. If `KeyValue`, `Collection`, `ImportedApi` etc. are no longer needed, clean up that file — but keep `HttpMethod` and `ResponseData` as they may still be referenced.

**Step: Commit**

```bash
git add -A
git commit -m "chore: remove placeholder src/app/ — replaced by src/features/api-explorer/"
```

---

### Task 22: TypeScript check and final cleanup

**Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Fix any reported errors. Common issues to watch for:
- `import.meta.glob` type — add `/// <reference types="vite/client" />` to `vite-env.d.ts` if missing
- `openapi-types` OpenAPIV3 — import from `'openapi-types'` not a sub-path
- Any remaining `@/app/` imports in other files

**Step 2: Run dev server to verify UI loads**

```bash
npm run dev
```

Open the app — verify:
- Sidebar shows "3DX API Explorer" header
- "Browse 3DExperience APIs" section lists all 50+ specs
- Toggling a spec activates it in the collection tree
- Clicking an endpoint pre-populates params, headers, body
- SecurityContext row appears in Query Params
- ENO_CSRF_TOKEN appears in Headers as read-only
- Body editor shows schema panel for POST/PUT endpoints
- Send button fires request through WAF pipeline

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors and verify API Explorer integration"
```

---

## Summary of Files Created/Modified

| Action | Path |
|--------|------|
| Modify | `src/services/types.ts` |
| Modify | `src/services/http/request-pipeline.ts` |
| Modify | `src/services/core/platform-resolver.ts` |
| Create | `src/features/api-explorer/openapi/types.ts` |
| Create | `src/features/api-explorer/openapi/schema-generator.ts` |
| Create | `src/features/api-explorer/openapi/parser.ts` |
| Create | `src/features/api-explorer/openapi/registry.ts` |
| Create | `src/features/api-explorer/openapi/index.ts` |
| Create | `src/features/api-explorer/platform/url-resolver.ts` |
| Create | `src/features/api-explorer/executor/waf-executor.ts` |
| Create | `src/features/api-explorer/hooks/use-built-in-specs.ts` |
| Create | `src/features/api-explorer/hooks/use-active-specs.ts` |
| Create | `src/features/api-explorer/hooks/use-execute-request.ts` |
| Create | `src/features/api-explorer/hooks/use-schema-panel.ts` |
| Create | `src/features/api-explorer/context/api-explorer-context.tsx` |
| Create | `src/features/api-explorer/components/response/response-panel.tsx` |
| Create | `src/features/api-explorer/components/schema/schema-panel.tsx` |
| Create | `src/features/api-explorer/components/request/method-badge.tsx` |
| Create | `src/features/api-explorer/components/request/params-editor.tsx` |
| Create | `src/features/api-explorer/components/request/headers-editor.tsx` |
| Create | `src/features/api-explorer/components/request/body-editor.tsx` |
| Create | `src/features/api-explorer/components/request/request-panel.tsx` |
| Create | `src/features/api-explorer/components/sidebar/history-panel.tsx` |
| Create | `src/features/api-explorer/components/sidebar/collection-tree.tsx` |
| Create | `src/features/api-explorer/components/sidebar/spec-browser.tsx` |
| Create | `src/features/api-explorer/components/sidebar/drop-zone.tsx` |
| Create | `src/features/api-explorer/components/api-explorer.tsx` |
| Create | `src/features/api-explorer/index.ts` |
| Modify | `src/routes/index.tsx` |
| Delete | `src/app/` (entire directory) |
