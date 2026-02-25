# Widget Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a configuration-driven widget framework where new 3DEXPERIENCE widgets are created by adding a config file, with dynamic tables, forms, tabs, drag-drop, and side panels all rendering from schema definitions.

**Architecture:** Schema-Driven Registry pattern. A `WidgetConfig` object describes everything a widget needs: endpoints, tabs, table columns, forms, commands. Feature components consume these configs and render accordingly. Services layer wraps WAFData for authenticated API calls with TanStack Query integration.

**Tech Stack:** React 19, TanStack Router/Query/Table, shadcn/Base UI components, Zod 4, React Hook Form, Tailwind CSS 4, TypeScript strict, 3DEXPERIENCE platform APIs via RequireJS.

---

## Phase 1: Core Types & Config Infrastructure

### Task 1: Create core config type system

**Files:**
- Create: `src/types/config.ts`

**Step 1: Create the config type definitions**

```typescript
import type { LucideIcon } from "lucide-react"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type EndpointDefinition = {
  id: string
  method: HttpMethod
  url: string
  payload?: Record<string, unknown>
  headers?: Record<string, string>
  responseMapping?: Record<string, string>
  defaultValues?: Record<string, unknown>
  requiresCsrf?: boolean
  params?: string[]
}

export type BadgeVariantMap = Record<string, "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning">

export type ColumnType = "text" | "badge" | "icon" | "link" | "image" | "custom"

export type ColumnDefinition = {
  id: string
  header: string
  accessorKey: string
  type: ColumnType
  sortable?: boolean
  filterable?: boolean
  width?: number
  minWidth?: number
  resolver?: EndpointDefinition
  badgeVariants?: BadgeVariantMap
  iconMap?: Record<string, string>
  linkTemplate?: string
  cellRenderer?: string
  visible?: boolean
}

export type CommandType = "expand" | "side-panel" | "navigate" | "action" | "dialog"

export type CommandDefinition = {
  id: string
  label: string
  icon: string
  type: CommandType
  endpoint?: EndpointDefinition
  panelConfig?: PanelConfig
  dialogConfig?: FormConfig
  navigateTo?: string
  condition?: string
}

export type FieldType = "text" | "textarea" | "select" | "combobox" | "number" | "date" | "toggle" | "hidden"

export type FormFieldDefinition = {
  id: string
  label: string
  type: FieldType
  accessorKey: string
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  optionsEndpoint?: EndpointDefinition
  readOnly?: boolean
  dependsOn?: string
  colSpan?: 1 | 2
}

export type FormConfig = {
  id: string
  title: string
  fields: FormFieldDefinition[]
  submitEndpoint?: EndpointDefinition
  mode: "view" | "edit" | "create"
  columns?: 1 | 2
}

export type PanelSection = {
  label: string
  fields: string[]
}

export type PanelConfig = {
  title: string
  endpoint: EndpointDefinition
  sections: PanelSection[]
  width?: "sm" | "md" | "lg"
}

export type TableConfig = {
  columns: ColumnDefinition[]
  commands: CommandDefinition[]
  selectable?: boolean
  expandable?: boolean
  pagination?: { pageSize: number; pageSizeOptions?: number[] }
  defaultSort?: { id: string; desc: boolean }
  toolbar?: ToolbarConfig
}

export type ToolbarAction = {
  id: string
  label: string
  icon: string
  endpoint?: EndpointDefinition
  variant?: "default" | "outline" | "ghost" | "destructive"
}

export type ToolbarConfig = {
  search?: boolean
  filters?: { id: string; label: string; accessorKey: string; options: { label: string; value: string }[] }[]
  actions?: ToolbarAction[]
}

export type TabContent = {
  type: "table" | "form" | "custom"
  table?: TableConfig
  form?: FormConfig
  component?: string
}

export type TabDefinition = {
  id: string
  label: string
  icon?: string
  endpoint?: EndpointDefinition
  content: TabContent
  visible?: boolean
  adminOnly?: boolean
  badge?: string
}

export type ObjectHeaderField = {
  key: string
  label: string
  type: "text" | "badge" | "link" | "boolean"
  badgeVariants?: BadgeVariantMap
}

export type ObjectHeaderConfig = {
  endpoint: EndpointDefinition
  iconField?: string
  titleField: string
  subtitleField?: string
  stateField?: string
  stateBadgeVariants?: BadgeVariantMap
  fields: ObjectHeaderField[]
}

export type DropZoneConfig = {
  enabled: boolean
  acceptTypes?: string[]
  message?: string
  idField?: string
  typeField?: string
}

export type WidgetConfig = {
  id: string
  title: string
  description?: string
  header?: ObjectHeaderConfig
  dropZone?: DropZoneConfig
  tabs: TabDefinition[]
  modules?: string[]
  defaultTab?: string
}
```

**Step 2: Commit**

```bash
git add src/types/config.ts
git commit -m "feat: add core config type system for widget framework"
```

---

### Task 2: Create endpoint definition helpers and sample endpoints

**Files:**
- Create: `src/config/endpoints/csrf.ts`
- Create: `src/config/endpoints/security-context.ts`
- Create: `src/config/endpoints/engineering-item.ts`
- Create: `src/config/endpoints/zone-query.ts`
- Create: `src/config/endpoints/relations.ts`
- Create: `src/config/endpoints/preferences.ts`
- Create: `src/config/endpoints/index.ts`

**Step 1: Create all endpoint definition files**

`src/config/endpoints/csrf.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"

export const GET_CSRF_TOKEN: EndpointDefinition = {
  id: "csrf-token",
  method: "GET",
  url: "/resources/v1/application/CSRF",
  requiresCsrf: false,
}
```

`src/config/endpoints/security-context.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"

export const GET_SECURITY_CONTEXT: EndpointDefinition = {
  id: "security-context",
  method: "GET",
  url: "/resources/modeler/pno/person?current=true&select=preferredcredentials&select=collabspaces",
  requiresCsrf: false,
}
```

`src/config/endpoints/engineering-item.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"

export const GET_ENGINEERING_ITEM: EndpointDefinition = {
  id: "engineering-item",
  method: "GET",
  url: "/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
  params: ["objectId"],
  requiresCsrf: true,
}

export const UPDATE_ENGINEERING_ITEM: EndpointDefinition = {
  id: "engineering-item-update",
  method: "PATCH",
  url: "/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
  params: ["objectId"],
  requiresCsrf: true,
}

export const CREATE_ENGINEERING_ITEM: EndpointDefinition = {
  id: "engineering-item-create",
  method: "POST",
  url: "/resources/v1/modeler/dseng/dseng:EngItem",
  requiresCsrf: true,
}
```

`src/config/endpoints/zone-query.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"

export const ZONE_QUERY: EndpointDefinition = {
  id: "zone-query",
  method: "POST",
  url: "/cvservlet/zonequeries",
  params: ["physicalId", "expandLevel"],
  payload: {
    root_path_physicalid: ["{{physicalId}}"],
    select_bo: [
      "type",
      "physicalId",
      "name",
      "revision",
      "ds6w:label",
      "description",
      "ds6w:policy",
      "ds6w:modified",
      "ds6w:created",
      "current",
      "cestamp",
      "owner",
      "ds6w:responsible",
      "ds6w:manufacturable",
      "ds6wg:EnterpriseExtension.V_PartNumber",
      "project",
      "organization",
      "ds6w:kind",
      "ds6w:reserved",
      "ds6w:reservedby",
      "ds6w:cadMaster",
      "ds6wg:PLMInstance.PLM_ExternalID",
      "ds6wg:PLMReference.V_isLastVersion",
      "ds6wg:WCGEquivalentDeclaredInertiaExt.V_WCG_Declared_COGx",
      "ds6wg:WCGEquivalentDeclaredInertiaExt.V_WCG_Declared_COGy",
      "ds6wg:WCGEquivalentDeclaredInertiaExt.V_WCG_Declared_COGz",
      "ds6wg:WCGEquivalentComputedExt.V_WCG_COGz",
      "ds6wg:WCGEquivalentComputedExt.V_WCG_COGy",
      "ds6wg:WCGEquivalentComputedExt.V_WCG_COGx",
      "ds6w:declaredWeight",
      "ds6w:Weight",
    ],
    label: "customZoneQuery",
    expand_iter: "{{expandLevel}}",
    select_rel: [
      "ds6w:type",
      "physicalId",
      "name",
      "ds6w:label",
      "description",
      "modified",
      "ds6w:created",
      "ds6wg:LPAbstractInstance.V_IsFixedInstance",
      "ds6w:description",
      "matrixTxt",
      "cestamp",
      "ro.plminstance.V_treeorder",
      "ds6wg:SynchroEBOMExt.V_InEBOMUser",
    ],
    compute_select_bo: ["icon", "thumbnail_2d"],
    fcs_url_mode: "REDIRECT",
    no_type_filter_rel: ["XCADBaseDependency"],
  },
  responseMapping: {
    physicalId: "id",
    label: "title",
    project: "collabspace",
    current: "state",
    manufacturable: "isManufacturable",
    "PLMReference.V_isLastVersion": "isLastVersion",
    "PLMInstance.PLM_ExternalID": "PLM_ExternalID",
    "EnterpriseExtension.V_PartNumber": "partNumber",
    "LPAbstractInstance.V_IsFixedInstance": "isFixedInstance",
    "ds6wg:WCGEquivalentDeclaredInertiaExt.V_WCG_Declared_COGx": "V_WCG_Declared_COGx",
    "ds6wg:WCGEquivalentDeclaredInertiaExt.V_WCG_Declared_COGy": "V_WCG_Declared_COGy",
    "ds6wg:WCGEquivalentDeclaredInertiaExt.V_WCG_Declared_COGz": "V_WCG_Declared_COGz",
    "ds6wg:WCGEquivalentComputedExt.V_WCG_COGz": "V_WCG_COGz",
    "ds6wg:WCGEquivalentComputedExt.V_WCG_COGy": "V_WCG_COGy",
    "ds6wg:WCGEquivalentComputedExt.V_WCG_COGx": "V_WCG_COGx",
  },
  defaultValues: {
    "dseno:EnterpriseAttributes": {},
    "dseng:EnterpriseReference": { partNumber: "" },
    kind: "",
    V_WCG_Declared_COGx: "0",
    V_WCG_Declared_COGy: "0",
    V_WCG_Declared_COGz: "0",
    V_WCG_COGz: "0",
    V_WCG_COGy: "0",
    V_WCG_COGx: "0",
    declaredWeight: "0",
    Weight: "0",
    PLM_ExternalID: "",
    reservedby: "",
  },
}

export const DEFAULT_ICONS: Record<string, string> = {
  VPMReference: "/snresources/images/icons/large/I_VPMNavProduct108x144.png",
  "3DPart": "/snresources/images/icons/large/I_3DPart108x144.png",
  "3DShape": "/snresources/images/icons/large/I_Part108x144.png",
  Drawing: "/snresources/images/icons/large/I_VPMNavDrawing108x144.png",
}
```

`src/config/endpoints/relations.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"

export const GET_ECOSYSTEM: EndpointDefinition = {
  id: "ecosystem",
  method: "POST",
  url: "/resources/enorelnav/v2/navigate/getEcosystem",
  params: ["objectId"],
  requiresCsrf: true,
}
```

`src/config/endpoints/preferences.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"

export const GET_WIDGET_PREFERENCES: EndpointDefinition = {
  id: "widget-preferences",
  method: "GET",
  url: "/resources/AppsMngt/user/preference",
  requiresCsrf: false,
}

export const SET_WIDGET_PREFERENCES: EndpointDefinition = {
  id: "widget-preferences-set",
  method: "PUT",
  url: "/resources/AppsMngt/user/preference",
  requiresCsrf: true,
}
```

`src/config/endpoints/index.ts`:
```typescript
export { GET_CSRF_TOKEN } from "./csrf"
export { GET_SECURITY_CONTEXT } from "./security-context"
export { GET_ENGINEERING_ITEM, UPDATE_ENGINEERING_ITEM, CREATE_ENGINEERING_ITEM } from "./engineering-item"
export { ZONE_QUERY, DEFAULT_ICONS } from "./zone-query"
export { GET_ECOSYSTEM } from "./relations"
export { GET_WIDGET_PREFERENCES, SET_WIDGET_PREFERENCES } from "./preferences"
```

**Step 2: Commit**

```bash
git add src/config/endpoints/
git commit -m "feat: add sample endpoint definitions for 3DEXPERIENCE APIs"
```

---

### Task 3: Create module loading configuration and dynamic loader

**Files:**
- Create: `src/config/modules.ts`
- Create: `src/lib/modules/loader.ts`
- Create: `src/lib/modules/registry.ts`

**Step 1: Create module configuration**

`src/config/modules.ts`:
```typescript
export const MODULE_REGISTRY = {
  "platform-api": "DS/PlatformAPI/PlatformAPI",
  "waf-data": "DS/WAFData/WAFData",
  "compass-services": "DS/i3DXCompassServices/i3DXCompassServices",
  "drag-drop": "DS/DataDragAndDrop/DataDragAndDrop",
  "uwa-core": "UWA/Core",
  "intercom": "UWA/Utils/InterCom",
  "webapps-utils": "DS/WebappsUtils/WebappsUtils",
  "tag-navigator": "DS/TagNavigatorProxy/TagNavigatorProxy",
} as const

export type ModuleKey = keyof typeof MODULE_REGISTRY

export const CORE_MODULES: ModuleKey[] = [
  "platform-api",
  "waf-data",
  "compass-services",
  "webapps-utils",
]
```

`src/lib/modules/registry.ts`:
```typescript
const loadedModules = new Map<string, unknown>()

export function registerModule(key: string, module: unknown) {
  loadedModules.set(key, module)
}

export function getModule<T = unknown>(key: string): T {
  const mod = loadedModules.get(key)
  if (!mod) throw new Error(`Module "${key}" not loaded. Check widget config modules array.`)
  return mod as T
}

export function hasModule(key: string): boolean {
  return loadedModules.has(key)
}

export function getLoadedModuleKeys(): string[] {
  return Array.from(loadedModules.keys())
}
```

`src/lib/modules/loader.ts`:
```typescript
import { MODULE_REGISTRY, CORE_MODULES, type ModuleKey } from "@/config/modules"
import { registerModule } from "./registry"
import { logger } from "@/lib/logger"

export function loadModules(additionalModules: ModuleKey[] = []): Promise<void> {
  const moduleKeys = [...new Set([...CORE_MODULES, ...additionalModules])]
  const requirePaths = moduleKeys.map((key) => MODULE_REGISTRY[key])

  return new Promise((resolve, reject) => {
    window.requirejs(
      requirePaths,
      (...modules: unknown[]) => {
        moduleKeys.forEach((key, index) => {
          registerModule(key, modules[index])
          logger.debug(`Module loaded: ${key}`)
        })
        logger.info(`Loaded ${moduleKeys.length} modules: ${moduleKeys.join(", ")}`)
        resolve()
      },
      (err: Error) => {
        logger.error("Failed to load modules", err)
        reject(err)
      },
    )
  })
}
```

**Step 2: Commit**

```bash
git add src/config/modules.ts src/lib/modules/
git commit -m "feat: add declarative RequireJS module loading system"
```

---

### Task 4: Create services layer (request wrapper, query factory, response mapper)

**Files:**
- Create: `src/services/request.ts`
- Create: `src/services/response-mapper.ts`
- Create: `src/services/query-factory.ts`
- Create: `src/services/mutation-factory.ts`
- Create: `src/services/index.ts`

**Step 1: Create authenticated request wrapper**

`src/services/request.ts`:
```typescript
import { getModule } from "@/lib/modules/registry"
import { logger } from "@/lib/logger"
import type { EndpointDefinition } from "@/types/config"
import type { WAFData, I3DXCompassServices } from "@/lib/widget/types"
import { getWidget } from "@/lib/widget/api"

let spaceUrlCache: string | null = null

export async function get3DSpaceUrl(): Promise<string> {
  if (spaceUrlCache) return spaceUrlCache
  const compassServices = getModule<I3DXCompassServices>("compass-services")
  const widget = getWidget()
  const tenant = widget.getValue("tenant") || "OnPremise"

  return new Promise((resolve, reject) => {
    (compassServices as any).getPlatformServices({
      tenant,
      onComplete: (data: any) => {
        const services = Array.isArray(data) ? data[0] : data
        const url = services["3DSpace"]
        if (url) {
          spaceUrlCache = url
          resolve(url)
        } else {
          reject(new Error("3DSpace service URL not found"))
        }
      },
      onFailure: reject,
    })
  })
}

let csrfCache: { token: string; timestamp: number } | null = null
const CSRF_TTL = 5 * 60 * 1000

export async function getCsrfToken(): Promise<string> {
  if (csrfCache && Date.now() - csrfCache.timestamp < CSRF_TTL) {
    return csrfCache.token
  }

  const spaceUrl = await get3DSpaceUrl()
  const wafData = getModule<WAFData>("waf-data")

  return new Promise((resolve, reject) => {
    ;(wafData as any).authenticatedRequest(`${spaceUrl}/resources/v1/application/CSRF`, {
      method: "GET",
      onComplete: (data: string) => {
        try {
          const response = JSON.parse(data)
          const token = response.csrf.value
          csrfCache = { token, timestamp: Date.now() }
          resolve(token)
        } catch {
          reject(new Error("Failed to parse CSRF response"))
        }
      },
      onFailure: reject,
    })
  })
}

function interpolateUrl(url: string, params: Record<string, string>): string {
  return url.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? "")
}

function interpolatePayload(payload: unknown, params: Record<string, string>): unknown {
  if (typeof payload === "string") {
    return payload.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? "")
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => interpolatePayload(item, params))
  }
  if (payload && typeof payload === "object") {
    return Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, interpolatePayload(v, params)]),
    )
  }
  return payload
}

export type RequestOptions = {
  params?: Record<string, string>
  body?: Record<string, unknown>
  signal?: AbortSignal
}

export async function executeEndpoint(
  endpoint: EndpointDefinition,
  options: RequestOptions = {},
): Promise<unknown> {
  const spaceUrl = await get3DSpaceUrl()
  const wafData = getModule<WAFData>("waf-data")
  const params = options.params ?? {}
  const url = `${spaceUrl}${interpolateUrl(endpoint.url, params)}`

  const requestOptions: Record<string, unknown> = {
    method: endpoint.method,
    type: "json",
  }

  if (endpoint.requiresCsrf) {
    const token = await getCsrfToken()
    requestOptions.headers = {
      ...endpoint.headers,
      ENO_CSRF_TOKEN: token,
    }
  } else if (endpoint.headers) {
    requestOptions.headers = endpoint.headers
  }

  if (endpoint.method !== "GET") {
    const payload = options.body ?? endpoint.payload
    if (payload) {
      requestOptions.data = JSON.stringify(interpolatePayload(payload, params))
      requestOptions.headers = {
        ...(requestOptions.headers as Record<string, string> | undefined),
        "Content-Type": "application/json",
      }
    }
  }

  logger.debug(`API ${endpoint.method} ${url}`, requestOptions)

  return new Promise((resolve, reject) => {
    ;(wafData as any).authenticatedRequest(url, {
      ...requestOptions,
      onComplete: (data: string) => {
        try {
          resolve(typeof data === "string" ? JSON.parse(data) : data)
        } catch {
          resolve(data)
        }
      },
      onFailure: (err: unknown) => {
        logger.error(`API call failed: ${endpoint.id}`, err)
        reject(err)
      },
    })
  })
}
```

**Step 2: Create response mapper**

`src/services/response-mapper.ts`:
```typescript
export function mapResponse(
  data: unknown,
  mapping: Record<string, string> | undefined,
  defaultValues: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  const items = extractItems(data)
  if (!mapping && !defaultValues) return items

  return items.map((item) => {
    const mapped = defaultValues ? { ...defaultValues } : {}

    for (const [key, value] of Object.entries(item)) {
      const cleanKey = key.replace(/^ds6w:|^ds6wg:/, "")
      const mappedKey = mapping?.[key] ?? mapping?.[cleanKey] ?? cleanKey
      mapped[mappedKey] = value
    }

    return mapped
  })
}

function extractItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.results)) return obj.results
    if (Array.isArray(obj.member)) return obj.member
    if (Array.isArray(obj.elements)) return obj.elements
    return [obj]
  }
  return []
}

export function mapSingleResponse(
  data: unknown,
  mapping: Record<string, string> | undefined,
  defaultValues: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const items = mapResponse(data, mapping, defaultValues)
  return items[0] ?? {}
}
```

**Step 3: Create query factory**

`src/services/query-factory.ts`:
```typescript
import { queryOptions } from "@tanstack/react-query"
import type { EndpointDefinition } from "@/types/config"
import { executeEndpoint, type RequestOptions } from "./request"
import { mapResponse, mapSingleResponse } from "./response-mapper"

export function createQueryOptions(
  endpoint: EndpointDefinition,
  params: Record<string, string> = {},
  options?: { single?: boolean; enabled?: boolean },
) {
  return queryOptions({
    queryKey: [endpoint.id, params],
    queryFn: async ({ signal }) => {
      const raw = await executeEndpoint(endpoint, { params, signal })
      if (options?.single) {
        return mapSingleResponse(raw, endpoint.responseMapping, endpoint.defaultValues)
      }
      return mapResponse(raw, endpoint.responseMapping, endpoint.defaultValues)
    },
    enabled: options?.enabled ?? true,
  })
}

export function createInfiniteQueryKey(endpoint: EndpointDefinition, params: Record<string, string>) {
  return [endpoint.id, "infinite", params] as const
}
```

**Step 4: Create mutation factory**

`src/services/mutation-factory.ts`:
```typescript
import type { EndpointDefinition } from "@/types/config"
import { executeEndpoint } from "./request"

export type MutationParams = {
  params?: Record<string, string>
  body?: Record<string, unknown>
}

export function createMutationFn(endpoint: EndpointDefinition) {
  return async (variables: MutationParams) => {
    return executeEndpoint(endpoint, {
      params: variables.params,
      body: variables.body,
    })
  }
}
```

`src/services/index.ts`:
```typescript
export { executeEndpoint, get3DSpaceUrl, getCsrfToken } from "./request"
export { mapResponse, mapSingleResponse } from "./response-mapper"
export { createQueryOptions } from "./query-factory"
export { createMutationFn, type MutationParams } from "./mutation-factory"
```

**Step 5: Commit**

```bash
git add src/services/
git commit -m "feat: add services layer with query/mutation factories and response mapping"
```

---

## Phase 2: Feature Components

### Task 5: Add required shadcn components (sheet, tabs, tooltip, skeleton, checkbox, switch, scroll-area, dialog, table, popover)

**Step 1: Install missing shadcn components**

```bash
npx shadcn@latest add sheet tabs tooltip skeleton checkbox switch scroll-area dialog table popover
```

Note: If any component fails, create manually following the existing Base UI + CVA pattern in `src/components/ui/`.

**Step 2: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shadcn sheet, tabs, tooltip, skeleton, checkbox, switch, scroll-area, dialog, table, popover"
```

---

### Task 6: Create drop zone feature

**Files:**
- Create: `src/features/drop-zone/use-object-drop.ts`
- Create: `src/features/drop-zone/drop-zone.tsx`

**Step 1: Create drop hook using platform DataDragAndDrop API**

`src/features/drop-zone/use-object-drop.ts`:
```typescript
import { useCallback, useEffect, useRef, useState } from "react"
import { getModule, hasModule } from "@/lib/modules/registry"
import type { DataDragAndDrop } from "@/lib/widget/types"
import type { DropZoneConfig } from "@/types/config"
import { logger } from "@/lib/logger"

export type DroppedObject = {
  objectId: string
  objectType: string
  displayName?: string
  envId?: string
  serviceId?: string
  contextId?: string
  [key: string]: unknown
}

export type UseObjectDropOptions = {
  config: DropZoneConfig
  onDrop: (objects: DroppedObject[]) => void
}

export function useObjectDrop({ config, onDrop }: UseObjectDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)
  const registeredRef = useRef(false)

  const handleDrop = useCallback(
    (data: string) => {
      setIsDragging(false)
      try {
        const parsed = JSON.parse(data)
        if (parsed.protocol !== "3DXContent") {
          logger.warn("Unsupported drop protocol:", parsed.protocol)
          return
        }

        let items: DroppedObject[] = parsed.data?.items ?? []

        if (config.acceptTypes?.length) {
          items = items.filter((item) => config.acceptTypes!.includes(item.objectType))
        }

        if (items.length > 0) {
          onDrop(items)
        }
      } catch (err) {
        logger.error("Failed to parse drop data", err)
      }
    },
    [config.acceptTypes, onDrop],
  )

  useEffect(() => {
    const el = elementRef.current
    if (!el || registeredRef.current || !hasModule("drag-drop")) return

    const dnd = getModule<DataDragAndDrop>("drag-drop")
    dnd.droppable(el, {
      drop: handleDrop,
      enter: () => setIsDragging(true),
      leave: () => setIsDragging(false),
      over: () => {},
    })
    registeredRef.current = true

    return () => {
      registeredRef.current = false
    }
  }, [handleDrop])

  return { elementRef, isDragging }
}
```

**Step 2: Create DropZone component**

`src/features/drop-zone/drop-zone.tsx`:
```typescript
import { cn } from "@/lib/utils"
import type { DropZoneConfig } from "@/types/config"
import { useObjectDrop, type DroppedObject } from "./use-object-drop"
import { Upload } from "lucide-react"

type DropZoneProps = {
  config: DropZoneConfig
  onDrop: (objects: DroppedObject[]) => void
  children?: React.ReactNode
  className?: string
}

export function DropZone({ config, onDrop, children, className }: DropZoneProps) {
  const { elementRef, isDragging } = useObjectDrop({ config, onDrop })

  if (!config.enabled) return <>{children}</>

  return (
    <div
      ref={elementRef}
      className={cn(
        "relative min-h-[120px] rounded-lg border-2 border-dashed transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/40",
        children && "border-transparent hover:border-transparent",
        className,
      )}
    >
      {children ?? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
          <Upload className="size-8" />
          <p className="text-sm font-medium">
            {config.message ?? "Drop an object here to begin"}
          </p>
          {config.acceptTypes && (
            <p className="text-xs">
              Accepts: {config.acceptTypes.join(", ")}
            </p>
          )}
        </div>
      )}
      {isDragging && children && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
          <div className="flex items-center gap-2 rounded-md bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
            <Upload className="size-4" />
            Drop here
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/features/drop-zone/
git commit -m "feat: add drop zone feature with 3DXContent protocol support"
```

---

### Task 7: Create object header feature

**Files:**
- Create: `src/features/object-header/object-header.tsx`

**Step 1: Create ObjectHeader component**

`src/features/object-header/object-header.tsx`:
```typescript
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { createQueryOptions } from "@/services/query-factory"
import type { ObjectHeaderConfig, BadgeVariantMap } from "@/types/config"
import { useQuery } from "@tanstack/react-query"
import { DEFAULT_ICONS } from "@/config/endpoints/zone-query"

type ObjectHeaderProps = {
  config: ObjectHeaderConfig
  objectId: string
  className?: string
}

function getStateBadgeVariant(state: string, variants?: BadgeVariantMap) {
  if (variants?.[state]) return variants[state]
  const lower = state.toLowerCase()
  if (lower === "released" || lower === "complete") return "success" as const
  if (lower === "in work" || lower === "active") return "info" as const
  if (lower === "obsolete") return "destructive" as const
  return "secondary" as const
}

export function ObjectHeader({ config, objectId, className }: ObjectHeaderProps) {
  const { data, isLoading } = useQuery(
    createQueryOptions(config.endpoint, { objectId }, { single: true }),
  )

  if (isLoading) {
    return (
      <div className={cn("flex gap-4 p-4", className)}>
        <Skeleton className="size-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-8 pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const objectType = data.type as string
  const iconUrl = config.iconField ? (data[config.iconField] as string) : DEFAULT_ICONS[objectType]
  const title = data[config.titleField] as string
  const subtitle = config.subtitleField ? (data[config.subtitleField] as string) : undefined
  const state = config.stateField ? (data[config.stateField] as string) : undefined

  return (
    <div className={cn("flex gap-4 border-b bg-card p-4", className)}>
      {iconUrl && (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
          <img src={iconUrl} alt={objectType} className="size-12 object-contain" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {state && (
            <Badge variant={getStateBadgeVariant(state, config.stateBadgeVariants)}>
              {state}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          {config.fields.map((field) => {
            const value = data[field.key]
            if (value == null || value === "") return null

            return (
              <div key={field.key} className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{field.label}:</span>
                {field.type === "badge" ? (
                  <Badge variant="outline" className="text-[0.625rem]">
                    {String(value)}
                  </Badge>
                ) : field.type === "link" ? (
                  <span className="text-primary cursor-pointer hover:underline">
                    {String(value)}
                  </span>
                ) : field.type === "boolean" ? (
                  <span className={value === "Yes" || value === true ? "text-green-600" : "text-muted-foreground"}>
                    {String(value)}
                  </span>
                ) : (
                  <span className="font-medium">{String(value)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/object-header/
git commit -m "feat: add object header component with dynamic field rendering"
```

---

### Task 8: Create tab manager feature with admin tab

**Files:**
- Create: `src/features/tab-manager/use-tabs.ts`
- Create: `src/features/tab-manager/tab-manager.tsx`
- Create: `src/features/tab-manager/admin-tab.tsx`

**Step 1: Create tab state hook**

`src/features/tab-manager/use-tabs.ts`:
```typescript
import { useCallback, useMemo, useState } from "react"
import type { TabDefinition } from "@/types/config"
import { getWidget } from "@/lib/widget/api"
import { logger } from "@/lib/logger"

type TabPreferences = {
  order: string[]
  hidden: string[]
}

const PREF_KEY = "widget_tab_preferences"

function loadPreferences(): TabPreferences | null {
  try {
    const widget = getWidget()
    const raw = widget.getValue(PREF_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePreferences(prefs: TabPreferences) {
  try {
    const widget = getWidget()
    widget.setValue(PREF_KEY, JSON.stringify(prefs))
  } catch (err) {
    logger.error("Failed to save tab preferences", err)
  }
}

export function useTabs(configTabs: TabDefinition[], defaultTab?: string) {
  const [preferences, setPreferences] = useState<TabPreferences>(() => {
    return loadPreferences() ?? { order: [], hidden: [] }
  })

  const visibleTabs = useMemo(() => {
    const ordered = [...configTabs].sort((a, b) => {
      const aIdx = preferences.order.indexOf(a.id)
      const bIdx = preferences.order.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    return ordered.filter(
      (tab) => tab.visible !== false && !preferences.hidden.includes(tab.id),
    )
  }, [configTabs, preferences])

  const allTabs = useMemo(() => {
    return configTabs.map((tab) => ({
      ...tab,
      isHidden: preferences.hidden.includes(tab.id),
    }))
  }, [configTabs, preferences])

  const [activeTab, setActiveTab] = useState(
    defaultTab ?? visibleTabs[0]?.id ?? "",
  )

  const toggleTab = useCallback(
    (tabId: string) => {
      setPreferences((prev) => {
        const hidden = prev.hidden.includes(tabId)
          ? prev.hidden.filter((id) => id !== tabId)
          : [...prev.hidden, tabId]
        const next = { ...prev, hidden }
        savePreferences(next)
        return next
      })
    },
    [],
  )

  const reorderTabs = useCallback(
    (order: string[]) => {
      setPreferences((prev) => {
        const next = { ...prev, order }
        savePreferences(next)
        return next
      })
    },
    [],
  )

  return {
    visibleTabs,
    allTabs,
    activeTab,
    setActiveTab,
    toggleTab,
    reorderTabs,
  }
}
```

**Step 2: Create admin tab**

`src/features/tab-manager/admin-tab.tsx`:
```typescript
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ArrowUp, ArrowDown } from "lucide-react"
import type { TabDefinition } from "@/types/config"

type AdminTabProps = {
  tabs: (TabDefinition & { isHidden: boolean })[]
  onToggle: (tabId: string) => void
  onReorder: (order: string[]) => void
}

export function AdminTab({ tabs, onToggle, onReorder }: AdminTabProps) {
  const moveTab = (index: number, direction: -1 | 1) => {
    const newOrder = tabs.map((t) => t.id)
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(index + direction, 0, moved)
    onReorder(newOrder)
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold">Tab Configuration</h3>
        <p className="text-xs text-muted-foreground">
          Toggle visibility and reorder tabs
        </p>
      </div>

      <div className="space-y-1">
        {tabs
          .filter((t) => !t.adminOnly)
          .map((tab, index) => (
            <div
              key={tab.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={!tab.isHidden}
                  onCheckedChange={() => onToggle(tab.id)}
                />
                <span className="text-sm">{tab.label}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={index === 0}
                  onClick={() => moveTab(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={index === tabs.filter((t) => !t.adminOnly).length - 1}
                  onClick={() => moveTab(index, 1)}
                >
                  <ArrowDown />
                </Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
```

**Step 3: Create TabManager component**

`src/features/tab-manager/tab-manager.tsx`:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TabDefinition } from "@/types/config"
import { useTabs } from "./use-tabs"
import { AdminTab } from "./admin-tab"
import { Settings } from "lucide-react"
import { Suspense, lazy } from "react"
import { Skeleton } from "@/components/ui/skeleton"

type TabManagerProps = {
  tabs: TabDefinition[]
  defaultTab?: string
  renderTabContent: (tab: TabDefinition) => React.ReactNode
  showAdmin?: boolean
  className?: string
}

export function TabManager({
  tabs,
  defaultTab,
  renderTabContent,
  showAdmin = true,
  className,
}: TabManagerProps) {
  const {
    visibleTabs,
    allTabs,
    activeTab,
    setActiveTab,
    toggleTab,
    reorderTabs,
  } = useTabs(tabs, defaultTab)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={className}>
      <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-4 h-auto gap-0">
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-xs"
          >
            {tab.label}
            {tab.badge && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem]">
                {tab.badge}
              </span>
            )}
          </TabsTrigger>
        ))}
        {showAdmin && (
          <TabsTrigger
            value="__admin"
            className="ml-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-2"
          >
            <Settings className="size-3.5" />
          </TabsTrigger>
        )}
      </TabsList>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0">
          <Suspense fallback={<TabSkeleton />}>
            {renderTabContent(tab)}
          </Suspense>
        </TabsContent>
      ))}

      {showAdmin && (
        <TabsContent value="__admin" className="mt-0">
          <AdminTab tabs={allTabs} onToggle={toggleTab} onReorder={reorderTabs} />
        </TabsContent>
      )}
    </Tabs>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/features/tab-manager/
git commit -m "feat: add tab manager with admin configuration panel"
```

---

### Task 9: Create dynamic data table feature

**Files:**
- Create: `src/features/data-table/use-table-data.ts`
- Create: `src/features/data-table/table-columns.tsx`
- Create: `src/features/data-table/table-commands.tsx`
- Create: `src/features/data-table/table-toolbar.tsx`
- Create: `src/features/data-table/data-table.tsx`

**Step 1: Create table data hook**

`src/features/data-table/use-table-data.ts`:
```typescript
import { useQuery } from "@tanstack/react-query"
import { createQueryOptions } from "@/services/query-factory"
import type { EndpointDefinition } from "@/types/config"

export function useTableData(
  endpoint: EndpointDefinition | undefined,
  params: Record<string, string> = {},
) {
  const query = useQuery({
    ...createQueryOptions(endpoint!, params),
    enabled: !!endpoint,
  })

  return {
    data: (query.data as Record<string, unknown>[]) ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

**Step 2: Create column renderer factory**

`src/features/data-table/table-columns.tsx`:
```typescript
import { Badge } from "@/components/ui/badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { ColumnDefinition } from "@/types/config"
import { Checkbox } from "@/components/ui/checkbox"

type RowData = Record<string, unknown>

function CellRenderer({ column, value }: { column: ColumnDefinition; value: unknown }) {
  const strValue = value != null ? String(value) : ""

  switch (column.type) {
    case "badge": {
      const variant = column.badgeVariants?.[strValue] ?? "secondary"
      return <Badge variant={variant}>{strValue}</Badge>
    }
    case "icon": {
      const iconUrl = column.iconMap?.[strValue] ?? strValue
      return iconUrl ? (
        <img src={iconUrl} alt={strValue} className="size-5 object-contain" />
      ) : null
    }
    case "link":
      return (
        <span className="text-primary cursor-pointer hover:underline text-xs">
          {strValue}
        </span>
      )
    case "image":
      return strValue ? (
        <img src={strValue} alt="" className="size-8 rounded object-cover" />
      ) : null
    default:
      return <span className="text-xs">{strValue}</span>
  }
}

export function buildColumns(
  columnDefs: ColumnDefinition[],
  options?: { selectable?: boolean },
): ColumnDef<RowData>[] {
  const columns: ColumnDef<RowData>[] = []

  if (options?.selectable) {
    columns.push({
      id: "__select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      size: 36,
      enableSorting: false,
    })
  }

  for (const colDef of columnDefs) {
    if (colDef.visible === false) continue

    columns.push({
      id: colDef.id,
      accessorKey: colDef.accessorKey,
      header: colDef.header,
      cell: ({ getValue }) => (
        <CellRenderer column={colDef} value={getValue()} />
      ),
      size: colDef.width,
      minSize: colDef.minWidth,
      enableSorting: colDef.sortable ?? false,
    })
  }

  return columns
}
```

**Step 3: Create table commands (row actions)**

`src/features/data-table/table-commands.tsx`:
```typescript
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CommandDefinition } from "@/types/config"
import {
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  PanelRight,
  Maximize2,
} from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  eye: Eye,
  pencil: Pencil,
  trash: Trash2,
  "external-link": ExternalLink,
  "panel-right": PanelRight,
  "chevron-down": ChevronDown,
  maximize: Maximize2,
}

type TableCommandsProps = {
  commands: CommandDefinition[]
  row: Record<string, unknown>
  onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void
}

export function TableCommands({ commands, row, onCommand }: TableCommandsProps) {
  const inlineCommands = commands.filter((c) => c.type === "expand" || c.type === "side-panel")
  const menuCommands = commands.filter((c) => c.type !== "expand" && c.type !== "side-panel")

  return (
    <div className="flex items-center gap-0.5">
      {inlineCommands.map((cmd) => {
        const Icon = ICON_MAP[cmd.icon] ?? Eye
        return (
          <Button
            key={cmd.id}
            variant="ghost"
            size="icon-xs"
            onClick={() => onCommand(cmd, row)}
            title={cmd.label}
          >
            <Icon className="size-3" />
          </Button>
        )
      })}

      {menuCommands.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuCommands.map((cmd) => {
              const Icon = ICON_MAP[cmd.icon] ?? Eye
              return (
                <DropdownMenuItem
                  key={cmd.id}
                  onClick={() => onCommand(cmd, row)}
                >
                  <Icon className="size-3.5 mr-2" />
                  {cmd.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
```

**Step 4: Create table toolbar**

`src/features/data-table/table-toolbar.tsx`:
```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ToolbarConfig } from "@/types/config"
import { Search, X } from "lucide-react"
import { useState } from "react"

type TableToolbarProps = {
  config?: ToolbarConfig
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  totalItems: number
  selectedItems: number
}

export function TableToolbar({
  config,
  globalFilter,
  onGlobalFilterChange,
  totalItems,
  selectedItems,
}: TableToolbarProps) {
  const [showSearch, setShowSearch] = useState(false)

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-2">
        {config?.search !== false && (
          <>
            {showSearch ? (
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Search..."
                  value={globalFilter}
                  onChange={(e) => onGlobalFilterChange(e.target.value)}
                  className="h-6 w-48 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setShowSearch(false)
                    onGlobalFilterChange("")
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowSearch(true)}
              >
                <Search />
              </Button>
            )}
          </>
        )}

        {config?.actions?.map((action) => (
          <Button key={action.id} variant={action.variant ?? "ghost"} size="sm">
            {action.label}
          </Button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Total Items: {totalItems}
        {selectedItems > 0 && <> &middot; Selected: {selectedItems}</>}
      </div>
    </div>
  )
}
```

**Step 5: Create main DataTable component**

`src/features/data-table/data-table.tsx`:
```typescript
import {
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useState, useMemo } from "react"
import type { TableConfig, CommandDefinition } from "@/types/config"
import { buildColumns } from "./table-columns"
import { TableCommands } from "./table-commands"
import { TableToolbar } from "./table-toolbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"

type RowData = Record<string, unknown>

type DataTableProps = {
  config: TableConfig
  data: RowData[]
  isLoading?: boolean
  onCommand?: (command: CommandDefinition, row: RowData) => void
  className?: string
}

export function DataTable({
  config,
  data,
  isLoading,
  onCommand,
  className,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>(
    config.defaultSort ? [config.defaultSort] : [],
  )
  const [globalFilter, setGlobalFilter] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const columns = useMemo(() => {
    const cols = buildColumns(config.columns, {
      selectable: config.selectable,
    })

    if (config.commands.length > 0) {
      cols.push({
        id: "__commands",
        header: "",
        cell: ({ row }) => (
          <TableCommands
            commands={config.commands}
            row={row.original}
            onCommand={(cmd, data) => onCommand?.(cmd, data)}
          />
        ),
        size: config.commands.length * 28 + 16,
        enableSorting: false,
      })
    }

    return cols
  }, [config.columns, config.commands, config.selectable, onCommand])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: config.pagination ? getPaginationRowModel() : undefined,
    getExpandedRowModel: config.expandable ? getExpandedRowModel() : undefined,
    initialState: {
      pagination: config.pagination
        ? { pageSize: config.pagination.pageSize }
        : undefined,
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-1 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <TableToolbar
        config={config.toolbar}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        totalItems={data.length}
        selectedItems={Object.keys(rowSelection).length}
      />

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "h-8 px-3 text-left font-medium text-muted-foreground",
                      header.column.getCanSort() && "cursor-pointer select-none",
                    )}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="size-3 text-muted-foreground/50" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    row.getIsSelected() && "bg-muted",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="h-9 px-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {config.pagination && (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/features/data-table/
git commit -m "feat: add dynamic data table with configurable columns, commands, toolbar, and pagination"
```

---

### Task 10: Create side panel feature

**Files:**
- Create: `src/features/side-panel/attribute-list.tsx`
- Create: `src/features/side-panel/side-panel.tsx`

**Step 1: Create attribute list component**

`src/features/side-panel/attribute-list.tsx`:
```typescript
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { PanelSection } from "@/types/config"

type AttributeListProps = {
  sections: PanelSection[]
  data: Record<string, unknown>
}

export function AttributeList({ sections, data }: AttributeListProps) {
  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={section.label}>
          {idx > 0 && <Separator className="mb-4" />}
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {section.label}
          </h4>
          <dl className="space-y-2">
            {section.fields.map((field) => {
              const value = data[field]
              return (
                <div key={field} className="flex items-start justify-between gap-4">
                  <dt className="text-xs text-muted-foreground shrink-0">{field}</dt>
                  <dd className="text-xs font-medium text-right truncate max-w-[200px]">
                    {value != null ? String(value) : "—"}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Create SidePanel component**

`src/features/side-panel/side-panel.tsx`:
```typescript
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { createQueryOptions } from "@/services/query-factory"
import type { PanelConfig } from "@/types/config"
import { AttributeList } from "./attribute-list"

type SidePanelProps = {
  config: PanelConfig
  objectId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WIDTH_MAP = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
}

export function SidePanel({ config, objectId, open, onOpenChange }: SidePanelProps) {
  const { data, isLoading } = useQuery({
    ...createQueryOptions(config.endpoint, { objectId: objectId ?? "" }, { single: true }),
    enabled: open && !!objectId,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={WIDTH_MAP[config.width ?? "md"]}>
        <SheetHeader>
          <SheetTitle className="text-sm">{config.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Object attributes
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          {isLoading ? (
            <div className="space-y-3 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : data ? (
            <AttributeList
              sections={config.sections}
              data={data as Record<string, unknown>}
            />
          ) : (
            <p className="pt-4 text-sm text-muted-foreground">No data available.</p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 3: Commit**

```bash
git add src/features/side-panel/
git commit -m "feat: add side panel with dynamic attribute sections"
```

---

### Task 11: Create dynamic form feature

**Files:**
- Create: `src/features/dynamic-form/field-renderer.tsx`
- Create: `src/features/dynamic-form/dynamic-form.tsx`
- Create: `src/features/dynamic-form/use-form-submit.ts`

**Step 1: Create field renderer**

`src/features/dynamic-form/field-renderer.tsx`:
```typescript
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { FormFieldDefinition } from "@/types/config"
import type { UseFormRegister, FieldErrors } from "react-hook-form"

type FieldRendererProps = {
  field: FormFieldDefinition
  register: UseFormRegister<Record<string, unknown>>
  errors: FieldErrors
  defaultValue?: unknown
}

export function FieldRenderer({ field, register, errors, defaultValue }: FieldRendererProps) {
  const error = errors[field.accessorKey]

  return (
    <div className={field.colSpan === 2 ? "col-span-2" : ""}>
      <Label htmlFor={field.id} className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          defaultValue={defaultValue as string}
          readOnly={field.readOnly}
          className="mt-1 text-xs"
          {...register(field.accessorKey, { required: field.required })}
        />
      ) : field.type === "select" && field.options ? (
        <select
          id={field.id}
          defaultValue={defaultValue as string}
          disabled={field.readOnly}
          className="mt-1 flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register(field.accessorKey, { required: field.required })}
        >
          <option value="">{field.placeholder ?? "Select..."}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "toggle" ? (
        <div className="mt-1">
          <Switch
            id={field.id}
            defaultChecked={!!defaultValue}
            disabled={field.readOnly}
            {...register(field.accessorKey)}
          />
        </div>
      ) : field.type === "hidden" ? (
        <input
          type="hidden"
          defaultValue={defaultValue as string}
          {...register(field.accessorKey)}
        />
      ) : (
        <Input
          id={field.id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          placeholder={field.placeholder}
          defaultValue={defaultValue as string}
          readOnly={field.readOnly}
          className="mt-1 text-xs"
          {...register(field.accessorKey, { required: field.required })}
        />
      )}

      {error && (
        <p className="mt-0.5 text-[0.625rem] text-destructive">
          {error.message as string ?? "This field is required"}
        </p>
      )}
    </div>
  )
}
```

**Step 2: Create form submit hook**

`src/features/dynamic-form/use-form-submit.ts`:
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createMutationFn } from "@/services/mutation-factory"
import type { EndpointDefinition } from "@/types/config"

export function useFormSubmit(
  endpoint: EndpointDefinition | undefined,
  options?: {
    invalidateKeys?: string[][]
    onSuccess?: (data: unknown) => void
    onError?: (error: unknown) => void
  },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: endpoint ? createMutationFn(endpoint) : async () => {},
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        for (const key of options.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      }
      options?.onSuccess?.(data)
    },
    onError: options?.onError,
  })
}
```

**Step 3: Create DynamicForm component**

`src/features/dynamic-form/dynamic-form.tsx`:
```typescript
import { Button } from "@/components/ui/button"
import type { FormConfig } from "@/types/config"
import { useForm } from "react-hook-form"
import { useFormSubmit } from "./use-form-submit"
import { FieldRenderer } from "./field-renderer"
import { Loader2 } from "lucide-react"

type DynamicFormProps = {
  config: FormConfig
  initialData?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
  onCancel?: () => void
  invalidateKeys?: string[][]
}

export function DynamicForm({
  config,
  initialData,
  onSuccess,
  onCancel,
  invalidateKeys,
}: DynamicFormProps) {
  const form = useForm<Record<string, unknown>>({
    defaultValues: initialData,
  })

  const mutation = useFormSubmit(config.submitEndpoint, {
    invalidateKeys,
    onSuccess,
  })

  const isViewMode = config.mode === "view"

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate({ body: data })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      <div className={`grid gap-3 ${config.columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {config.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={{ ...field, readOnly: isViewMode || field.readOnly }}
            register={form.register}
            errors={form.formState.errors}
            defaultValue={initialData?.[field.accessorKey]}
          />
        ))}
      </div>

      {!isViewMode && (
        <div className="flex items-center justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {config.mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      )}
    </form>
  )
}
```

**Step 4: Commit**

```bash
git add src/features/dynamic-form/
git commit -m "feat: add dynamic form with field renderer and mutation support"
```

---

## Phase 3: Widget Configuration & Wiring

### Task 12: Create widget registry and sample engineering BOM config

**Files:**
- Create: `src/config/widgets/engineering-bom.ts`
- Create: `src/config/widgets/index.ts`
- Create: `src/config/registry.ts`

**Step 1: Create engineering BOM widget config**

`src/config/widgets/engineering-bom.ts`:
```typescript
import type { WidgetConfig } from "@/types/config"
import { ZONE_QUERY } from "@/config/endpoints/zone-query"
import { GET_ENGINEERING_ITEM, UPDATE_ENGINEERING_ITEM } from "@/config/endpoints/engineering-item"
import { GET_ECOSYSTEM } from "@/config/endpoints/relations"

export const engineeringBomConfig: WidgetConfig = {
  id: "engineering-bom",
  title: "Engineering BOM",
  description: "Engineering Bill of Materials viewer with structure navigation",

  header: {
    endpoint: ZONE_QUERY,
    titleField: "title",
    subtitleField: "name",
    stateField: "state",
    iconField: "icon",
    stateBadgeVariants: {
      "In Work": "info",
      Released: "success",
      Obsolete: "destructive",
      Frozen: "warning",
      Private: "secondary",
    },
    fields: [
      { key: "owner", label: "Owner", type: "link" },
      { key: "collabspace", label: "Collaborative Space", type: "link" },
      { key: "organization", label: "Organization", type: "text" },
      { key: "revision", label: "Revision", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "isLastVersion", label: "Is Last Version", type: "boolean" },
    ],
  },

  dropZone: {
    enabled: true,
    acceptTypes: ["VPMReference", "3DPart"],
    message: "Drop an Engineering Item to view its BOM structure",
    idField: "objectId",
    typeField: "objectType",
  },

  modules: ["platform-api", "waf-data", "compass-services", "drag-drop", "webapps-utils"],

  defaultTab: "structure",

  tabs: [
    {
      id: "structure",
      label: "Structure",
      endpoint: ZONE_QUERY,
      content: {
        type: "table",
        table: {
          columns: [
            {
              id: "icon",
              header: "",
              accessorKey: "icon",
              type: "image",
              width: 36,
              sortable: false,
            },
            {
              id: "title",
              header: "Title",
              accessorKey: "title",
              type: "text",
              sortable: true,
              filterable: true,
              minWidth: 150,
            },
            {
              id: "name",
              header: "Name",
              accessorKey: "name",
              type: "text",
              sortable: true,
              filterable: true,
              minWidth: 180,
            },
            {
              id: "revision",
              header: "Revision",
              accessorKey: "revision",
              type: "text",
              sortable: true,
              width: 80,
            },
            {
              id: "state",
              header: "Maturity State",
              accessorKey: "state",
              type: "badge",
              sortable: true,
              width: 120,
              badgeVariants: {
                "In Work": "info",
                Released: "success",
                Obsolete: "destructive",
                Frozen: "warning",
              },
            },
            {
              id: "type",
              header: "Type",
              accessorKey: "type",
              type: "text",
              sortable: true,
              width: 120,
            },
            {
              id: "owner",
              header: "Owner",
              accessorKey: "owner",
              type: "text",
              sortable: true,
              width: 120,
            },
            {
              id: "description",
              header: "Description",
              accessorKey: "description",
              type: "text",
              sortable: false,
              minWidth: 200,
            },
          ],
          commands: [
            {
              id: "view-info",
              label: "View Information",
              icon: "panel-right",
              type: "side-panel",
              panelConfig: {
                title: "Object Details",
                endpoint: GET_ENGINEERING_ITEM,
                width: "md",
                sections: [
                  {
                    label: "General",
                    fields: ["title", "name", "revision", "type", "state", "description"],
                  },
                  {
                    label: "Ownership",
                    fields: ["owner", "organization", "collabspace"],
                  },
                  {
                    label: "Weight & COG",
                    fields: [
                      "declaredWeight",
                      "Weight",
                      "V_WCG_Declared_COGx",
                      "V_WCG_Declared_COGy",
                      "V_WCG_Declared_COGz",
                    ],
                  },
                ],
              },
            },
            {
              id: "expand",
              label: "Expand",
              icon: "chevron-down",
              type: "expand",
            },
            {
              id: "edit",
              label: "Edit",
              icon: "pencil",
              type: "dialog",
              dialogConfig: {
                id: "edit-eng-item",
                title: "Edit Engineering Item",
                mode: "edit",
                columns: 2,
                submitEndpoint: UPDATE_ENGINEERING_ITEM,
                fields: [
                  { id: "title", label: "Title", type: "text", accessorKey: "title", required: true },
                  { id: "name", label: "Name", type: "text", accessorKey: "name", readOnly: true },
                  { id: "revision", label: "Revision", type: "text", accessorKey: "revision", readOnly: true },
                  { id: "description", label: "Description", type: "textarea", accessorKey: "description", colSpan: 2 },
                ],
              },
            },
            {
              id: "navigate",
              label: "Open in 3DDashboard",
              icon: "external-link",
              type: "navigate",
            },
          ],
          selectable: true,
          expandable: true,
          pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
          defaultSort: { id: "title", desc: false },
          toolbar: {
            search: true,
            actions: [
              { id: "refresh", label: "Refresh", icon: "refresh", variant: "ghost" },
            ],
          },
        },
      },
    },
    {
      id: "ecosystem",
      label: "Relationships",
      endpoint: GET_ECOSYSTEM,
      content: {
        type: "table",
        table: {
          columns: [
            { id: "rel-type", header: "Relationship", accessorKey: "relationType", type: "text", sortable: true, minWidth: 150 },
            { id: "rel-target-title", header: "Title", accessorKey: "targetTitle", type: "text", sortable: true, minWidth: 180 },
            { id: "rel-target-type", header: "Type", accessorKey: "targetType", type: "badge", sortable: true, width: 120 },
            { id: "rel-target-state", header: "State", accessorKey: "targetState", type: "badge", sortable: true, width: 120, badgeVariants: { "In Work": "info", Released: "success" } },
          ],
          commands: [
            { id: "view-rel-info", label: "View", icon: "panel-right", type: "side-panel", panelConfig: { title: "Relationship Details", endpoint: GET_ENGINEERING_ITEM, width: "md", sections: [{ label: "Target", fields: ["targetTitle", "targetType", "targetState"] }] } },
          ],
          selectable: false,
          pagination: { pageSize: 25 },
        },
      },
    },
    {
      id: "properties",
      label: "Properties",
      content: {
        type: "form",
        form: {
          id: "properties-form",
          title: "Object Properties",
          mode: "view",
          columns: 2,
          fields: [
            { id: "prop-title", label: "Title", type: "text", accessorKey: "title" },
            { id: "prop-name", label: "Name", type: "text", accessorKey: "name" },
            { id: "prop-revision", label: "Revision", type: "text", accessorKey: "revision" },
            { id: "prop-type", label: "Type", type: "text", accessorKey: "type" },
            { id: "prop-state", label: "State", type: "text", accessorKey: "state" },
            { id: "prop-owner", label: "Owner", type: "text", accessorKey: "owner" },
            { id: "prop-org", label: "Organization", type: "text", accessorKey: "organization" },
            { id: "prop-collab", label: "Collaborative Space", type: "text", accessorKey: "collabspace" },
            { id: "prop-description", label: "Description", type: "textarea", accessorKey: "description", colSpan: 2 },
            { id: "prop-partNumber", label: "Part Number", type: "text", accessorKey: "partNumber" },
            { id: "prop-weight", label: "Weight", type: "number", accessorKey: "Weight" },
            { id: "prop-declaredWeight", label: "Declared Weight", type: "number", accessorKey: "declaredWeight" },
          ],
        },
      },
    },
  ],
}
```

**Step 2: Create widget registry**

`src/config/widgets/index.ts`:
```typescript
import type { WidgetConfig } from "@/types/config"
import { engineeringBomConfig } from "./engineering-bom"

const WIDGET_CONFIGS: Record<string, WidgetConfig> = {
  "engineering-bom": engineeringBomConfig,
}

export function getWidgetConfig(id: string): WidgetConfig {
  const config = WIDGET_CONFIGS[id]
  if (!config) throw new Error(`Widget config "${id}" not found. Available: ${Object.keys(WIDGET_CONFIGS).join(", ")}`)
  return config
}

export function getAvailableWidgets(): { id: string; title: string; description?: string }[] {
  return Object.values(WIDGET_CONFIGS).map(({ id, title, description }) => ({
    id,
    title,
    description,
  }))
}

export function registerWidgetConfig(config: WidgetConfig) {
  WIDGET_CONFIGS[config.id] = config
}
```

`src/config/registry.ts`:
```typescript
export { getWidgetConfig, getAvailableWidgets, registerWidgetConfig } from "./widgets"
export { MODULE_REGISTRY, CORE_MODULES, type ModuleKey } from "./modules"
```

**Step 3: Commit**

```bash
git add src/config/
git commit -m "feat: add widget registry with Engineering BOM sample configuration"
```

---

### Task 13: Create the main widget shell component

**Files:**
- Create: `src/features/widget-shell/widget-shell.tsx`
- Create: `src/features/widget-shell/tab-content-renderer.tsx`

**Step 1: Create tab content renderer**

`src/features/widget-shell/tab-content-renderer.tsx`:
```typescript
import { DataTable } from "@/features/data-table/data-table"
import { DynamicForm } from "@/features/dynamic-form/dynamic-form"
import { useTableData } from "@/features/data-table/use-table-data"
import type { TabDefinition, CommandDefinition } from "@/types/config"

type TabContentRendererProps = {
  tab: TabDefinition
  params: Record<string, string>
  onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void
}

export function TabContentRenderer({ tab, params, onCommand }: TabContentRendererProps) {
  if (tab.content.type === "table" && tab.content.table) {
    return (
      <TableTabContent
        tab={tab}
        params={params}
        onCommand={onCommand}
      />
    )
  }

  if (tab.content.type === "form" && tab.content.form) {
    return <DynamicForm config={tab.content.form} />
  }

  return (
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
      Custom component: {tab.content.component ?? "Not configured"}
    </div>
  )
}

function TableTabContent({
  tab,
  params,
  onCommand,
}: TabContentRendererProps) {
  const { data, isLoading } = useTableData(tab.endpoint, params)

  return (
    <DataTable
      config={tab.content.table!}
      data={data}
      isLoading={isLoading}
      onCommand={onCommand}
    />
  )
}
```

**Step 2: Create widget shell**

`src/features/widget-shell/widget-shell.tsx`:
```typescript
import { useState, useCallback } from "react"
import type { WidgetConfig, CommandDefinition, PanelConfig } from "@/types/config"
import { DropZone } from "@/features/drop-zone/drop-zone"
import { ObjectHeader } from "@/features/object-header/object-header"
import { TabManager } from "@/features/tab-manager/tab-manager"
import { SidePanel } from "@/features/side-panel/side-panel"
import { TabContentRenderer } from "./tab-content-renderer"
import type { DroppedObject } from "@/features/drop-zone/use-object-drop"

type WidgetShellProps = {
  config: WidgetConfig
}

export function WidgetShell({ config }: WidgetShellProps) {
  const [objectId, setObjectId] = useState<string | null>(null)
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null)
  const [panelObjectId, setPanelObjectId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const handleDrop = useCallback(
    (objects: DroppedObject[]) => {
      const first = objects[0]
      if (first) {
        const id = config.dropZone?.idField
          ? (first[config.dropZone.idField] as string)
          : first.objectId
        setObjectId(id)
      }
    },
    [config.dropZone?.idField],
  )

  const handleCommand = useCallback(
    (command: CommandDefinition, row: Record<string, unknown>) => {
      switch (command.type) {
        case "side-panel":
          if (command.panelConfig) {
            setPanelConfig(command.panelConfig)
            setPanelObjectId((row.id as string) ?? (row.physicalId as string) ?? "")
            setPanelOpen(true)
          }
          break
        case "navigate":
          break
        case "expand":
          break
        case "dialog":
          break
        case "action":
          break
      }
    },
    [],
  )

  const params = objectId ? { physicalId: objectId, objectId, expandLevel: "1" } : {}

  if (!objectId && config.dropZone?.enabled) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <DropZone config={config.dropZone} onDrop={handleDrop} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {config.header && objectId && (
        <ObjectHeader config={config.header} objectId={objectId} />
      )}

      {config.dropZone?.enabled && (
        <DropZone config={config.dropZone} onDrop={handleDrop}>
          <TabManager
            tabs={config.tabs}
            defaultTab={config.defaultTab}
            renderTabContent={(tab) => (
              <TabContentRenderer
                tab={tab}
                params={params}
                onCommand={handleCommand}
              />
            )}
          />
        </DropZone>
      )}

      {!config.dropZone?.enabled && (
        <TabManager
          tabs={config.tabs}
          defaultTab={config.defaultTab}
          renderTabContent={(tab) => (
            <TabContentRenderer
              tab={tab}
              params={params}
              onCommand={handleCommand}
            />
          )}
        />
      )}

      {panelConfig && (
        <SidePanel
          config={panelConfig}
          objectId={panelObjectId}
          open={panelOpen}
          onOpenChange={setPanelOpen}
        />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/features/widget-shell/
git commit -m "feat: add widget shell that orchestrates all features from config"
```

---

### Task 14: Update main entry point and route to use widget framework

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/lib/widget/api.ts` (update to use new module system)

**Step 1: Update main.tsx to use module loader**

Replace the current RequireJS loading in `src/main.tsx` with the new module loader pattern. Keep the same widget detection and event handling. Change the `start()` function to use `loadModules()` from the new module system, then build DSPlatformAPIs from the registry.

Key changes:
- Import `loadModules` from `@/lib/modules/loader`
- Import `getModule` from `@/lib/modules/registry`
- Import `getWidgetConfig` from `@/config/registry`
- Load modules declared in the widget config
- Build the DSPlatformAPIs object from loaded modules via getModule()
- Rest stays the same (WidgetProvider, RouterProvider)

**Step 2: Update routes/index.tsx**

Replace the CSRF token demo with the WidgetShell:

```typescript
import { getWidgetConfig } from "@/config/registry"
import { WidgetShell } from "@/features/widget-shell/widget-shell"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const config = getWidgetConfig("engineering-bom")
  return <WidgetShell config={config} />
}
```

**Step 3: Commit**

```bash
git add src/main.tsx src/routes/index.tsx src/lib/widget/api.ts
git commit -m "feat: wire widget framework into main entry point and home route"
```

---

### Task 15: Add info and success badge variants

**Files:**
- Modify: `src/components/ui/badge.tsx`

**Step 1: Add info, success, and warning variants to badgeVariants**

Add these to the `variants.variant` object in badge.tsx:

```typescript
info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30",
success: "bg-green-500/10 text-green-700 dark:text-green-400 dark:bg-green-500/20 border-green-200 dark:border-green-500/30",
warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30",
```

**Step 2: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat: add info, success, warning badge variants"
```

---

### Task 16: Install @dnd-kit if not already present (for admin tab reorder future enhancement)

This is optional. The admin tab currently uses arrow buttons for reordering. If drag-based reorder is desired later, install:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Skip this task if arrow buttons are sufficient.

---

### Task 17: Verify TypeScript compilation

**Step 1: Run type check**

```bash
npx tsc --noEmit
```

Fix any type errors that appear.

**Step 2: Run biome check**

```bash
npx biome check --write src/
```

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and formatting issues"
```

---

### Task 18: Verify build

**Step 1: Run production build**

```bash
npm run build
```

**Step 2: Fix any build errors**

**Step 3: Commit if needed**

---

## Summary of files created

```
src/
  types/config.ts                              # Core config type system
  config/
    registry.ts                                # Re-exports
    modules.ts                                 # RequireJS module config
    endpoints/
      index.ts, csrf.ts, security-context.ts,
      engineering-item.ts, zone-query.ts,
      relations.ts, preferences.ts             # Endpoint definitions
    widgets/
      index.ts                                 # Widget registry
      engineering-bom.ts                       # Sample widget config
  lib/modules/
    loader.ts                                  # Dynamic RequireJS loader
    registry.ts                                # Module availability registry
  services/
    index.ts                                   # Service exports
    request.ts                                 # WAFData wrapper + CSRF
    response-mapper.ts                         # API response transformation
    query-factory.ts                           # TanStack Query factory
    mutation-factory.ts                        # TanStack Mutation factory
  features/
    drop-zone/
      drop-zone.tsx                            # Drop zone UI
      use-object-drop.ts                       # 3DXContent drop hook
    object-header/
      object-header.tsx                        # Object detail header
    tab-manager/
      tab-manager.tsx                          # Tab bar + routing
      admin-tab.tsx                            # Admin configuration
      use-tabs.ts                              # Tab state management
    data-table/
      data-table.tsx                           # Dynamic table
      table-columns.tsx                        # Column renderer factory
      table-commands.tsx                       # Row action renderer
      table-toolbar.tsx                        # Search, filters, actions
      use-table-data.ts                        # Data fetching hook
    side-panel/
      side-panel.tsx                           # Sliding panel
      attribute-list.tsx                       # Key-value display
    dynamic-form/
      dynamic-form.tsx                         # Form renderer
      field-renderer.tsx                       # Per-field renderer
      use-form-submit.ts                       # Form mutation hook
    widget-shell/
      widget-shell.tsx                         # Main orchestrator
      tab-content-renderer.tsx                 # Tab → component routing
```
