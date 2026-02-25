# CLAUDE.md — TanStack Start Widget Template

This file gives Claude Code the full context needed to work effectively in this codebase. Read it in full before making changes.

---

## Project Overview

This is a **React + Vite + TypeScript widget template** for building custom apps inside **Dassault Systèmes 3DDashboard** (3DExperience platform). It is **not** a standalone web app — it runs inside an iframe hosted by the 3DDashboard widget system.

The second workspace (`vite-typescript-tailwind-template/client`) is an older, more traditional version using React Router DOM + Redux. This template (`tanstack-start-widget-template`) is the **primary / modern template** and supersedes it.

---

## Development Commands

```bash
npm run dev           # Vite dev server on port 3999 (hot reload, for local UI testing)
npm run build         # Production build → dist/
npm run dev:widget    # Recommended for widget testing: build --watch + vite preview
npm run preview       # Serve the built dist/ on port 3999
npm run test          # Vitest unit tests
npm run lint          # Biome lint
npm run format        # Biome format
npm run check         # Biome check (lint + format combined)
```

> **For widget deployment**, use `npm run dev:widget`. This builds in watch mode and serves via Vite preview so the widget can be loaded inside 3DDashboard at `http://<host>:3999/index.html`.

---

## Key Architectural Concepts

### 1. Widget Lifecycle (CRITICAL — do not break this)

The widget does NOT render on page load like a normal React app. It must wait for `window.widget` to be provided by the 3DDashboard platform:

```
window.widget available? → addEvent("onLoad") → load AMD modules via requirejs → init() APIs → render React
```

**`src/main.tsx`** orchestrates this:

1. `waitFor(() => window.widget != null, 1000)` — polls for the widget object
2. `window.widget.addEvent("onLoad", ...)` — boots the app when 3DDashboard says it's ready
3. `loadModules([...])` — loads AMD modules from the platform via `window.requirejs`
4. `init(apis, window.widget, window.UWA)` — stores refs globally in `src/lib/widget/api.ts`
5. `ReactDOM.createRoot(rootEl).render(...)` — mounts the React app

**Never** call `ReactDOM.createRoot` before `init()` completes. All platform APIs depend on those refs being set first.

### 2. AMD Module System (Platform APIs)

3DDashboard uses **RequireJS / AMD** for its platform APIs. These are loaded asynchronously at startup via `window.requirejs(paths, callback)`.

**Module registry** (`src/config/modules.ts`):

```ts
export const MODULE_REGISTRY = {
  'platform-api': 'DS/PlatformAPI/PlatformAPI',
  'waf-data': 'DS/WAFData/WAFData',
  'compass-services': 'DS/i3DXCompassServices/i3DXCompassServices',
  'drag-drop': 'DS/DataDragAndDrop/DataDragAndDrop',
  'uwa-core': 'UWA/Core',
  intercom: 'UWA/Utils/InterCom',
  'webapps-utils': 'DS/WebappsUtils/WebappsUtils',
  'tag-navigator': 'DS/TagNavigatorProxy/TagNavigatorProxy',
};
```

Core modules (always loaded): `platform-api`, `waf-data`, `compass-services`, `webapps-utils`.
Additional modules are requested per-widget in `WidgetConfig.modules[]`.

**In-memory registry** (`src/lib/modules/registry.ts`):

- `registerModule(key, module)` — called during bootstrap
- `getModule<T>(key)` — used throughout services to retrieve loaded modules
- `hasModule(key)` — safe check before use

### 3. Platform API Singletons (`src/lib/widget/api.ts`)

After `init()`, three global singletons are accessible anywhere:

```ts
import { getAPIs, getWidget, getUWA } from '@/lib/widget/api';

const widget = getWidget(); // window.widget proxy
const uwa = getUWA(); // window.UWA proxy
const apis = getAPIs(); // { PlatformAPI, WAFData, i3DXCompassServices, ... }
```

These throw if called before `init()`. Do not call them at module top-level.

### 4. Widget Context (React)

`src/lib/widget/context.tsx` provides a React context with the same data:

```ts
const { widget, uwa, apis } = useWidget();
```

This is the preferred way to access platform data inside React components.

### 5. HTTP / API Layer

All API calls go through **`src/services/request.ts`** via `WAFData.authenticatedRequest`, NOT native `fetch`. This is because 3DDashboard requires platform-authenticated requests.

**Key functions:**

- `get3DSpaceUrl()` — resolves the 3DSpace service URL via `i3DXCompassServices.getPlatformServices`
- `getCsrfToken()` — fetches a CSRF token from `3DSpace/resources/v1/application/CSRF` (cached for 5 min)
- `executeEndpoint(definition, options)` — the universal HTTP executor; handles URL interpolation, CSRF injection, payload, and response parsing

**Never use `fetch` or `axios`** for 3DSpace API calls. Always use `WAFData.authenticatedRequest`.

### 6. Configuration-Driven Widgets

Widgets are configured declaratively in `src/config/widgets/`. The entire UI (tables, tabs, forms, side panels, drop zones) is driven by `WidgetConfig` objects defined in `src/types/config.ts`.

**Top-level shape:**

```ts
type WidgetConfig = {
  id: string;
  title: string;
  header?: ObjectHeaderConfig; // breadcrumb/header bar above tabs
  dropZone?: DropZoneConfig; // drag-and-drop object receiver
  tabs: TabDefinition[]; // tab strip driven by TabManager
  modules?: string[]; // additional AMD modules to load
  defaultTab?: string;
};
```

Each `TabDefinition.content` can be a `table`, `form`, or `custom` type — rendered automatically by `TabContentRenderer`.

**To add a new widget:** create a config file in `src/config/widgets/`, register it in `src/config/widgets/index.ts`'s `WIDGET_CONFIGS` map.

### 7. Data Fetching (TanStack Query)

Use `createQueryOptions` from `src/services/query-factory.ts` to wrap endpoint definitions:

```ts
const options = createQueryOptions(MY_ENDPOINT, { physicalId: 'abc123' });
const { data } = useQuery(options);
```

Response mapping (`responseMapping`, `defaultValues`) is handled automatically via `src/services/response-mapper.ts`, which normalizes `ds6w:` and `ds6wg:` prefixed keys from 3DSpace responses.

For mutations, use `createMutationFn` from `src/services/mutation-factory.ts`.

---

## Directory Structure

```
src/
├── main.tsx                  # Entry: widget lifecycle, AMD loading, React mount
├── router.tsx                # TanStack Router setup (base path from env)
├── routeTree.gen.ts          # Auto-generated by @tanstack/router-plugin — DO NOT EDIT
├── index.css                 # Global styles (Tailwind v4)
│
├── routes/
│   ├── __root.tsx            # Root layout: wraps with TanStackQueryProvider + DevTools
│   └── index.tsx             # Default route
│
├── config/
│   ├── modules.ts            # AMD module key↔path registry + CORE_MODULES list
│   ├── registry.ts           # Re-export barrel for config
│   ├── endpoints/            # Endpoint definitions (EndpointDefinition objects)
│   │   ├── zone-query.ts     # ZONE_QUERY — main BOM structure query
│   │   ├── engineering-item.ts
│   │   ├── relations.ts
│   │   ├── preferences.ts
│   │   ├── security-context.ts
│   │   ├── csrf.ts
│   │   └── index.ts
│   └── widgets/
│       ├── engineering-bom.ts  # Example widget config (full BOM viewer)
│       └── index.ts            # Widget registry: getWidgetConfig, registerWidgetConfig
│
├── components/
│   ├── root-provider.tsx     # QueryClient singleton + QueryClientProvider
│   └── ui/                   # Shadcn/ui component library (Button, Dialog, Table, etc.)
│
├── features/                 # High-level feature components
│   ├── widget-shell/         # Main layout orchestrator (DropZone + Header + Tabs + SidePanel)
│   │   ├── widget-shell.tsx
│   │   └── tab-content-renderer.tsx
│   ├── tab-manager/          # Tab strip + admin tab for show/hide/reorder
│   │   ├── tab-manager.tsx
│   │   ├── admin-tab.tsx
│   │   └── use-tabs.ts
│   ├── drop-zone/            # Drag-and-drop receiver using DataDragAndDrop AMD module
│   │   ├── drop-zone.tsx
│   │   └── use-object-drop.ts
│   ├── data-table/           # TanStack Table with sorting, filtering, pagination, commands
│   ├── dynamic-form/         # Form renderer from FormConfig
│   ├── object-header/        # Object detail header (title, state badge, fields)
│   └── side-panel/           # Sliding panel for detail views
│
├── lib/
│   ├── env.ts                # T3Env type-safe env (VITE_WIDGET_BASE_PATH)
│   ├── logger.ts             # Styled console logger (INFO=blue, WARN=amber, ERROR=red, DEBUG=green)
│   ├── utils.ts              # cn(), get3DSpaceUrl(), fetchCsrfToken()
│   ├── modules/
│   │   ├── loader.ts         # loadModules(): calls window.requirejs with aggregated paths
│   │   └── registry.ts       # In-memory Map of loaded AMD modules
│   ├── hooks/
│   │   └── useDropzone.ts    # Low-level dropzone hook
│   └── widget/
│       ├── api.ts            # init(), getAPIs(), getWidget(), getUWA() singletons
│       ├── context.tsx       # WidgetProvider + useWidget() React hook
│       └── types.ts          # Widget, UWA, DSPlatformAPIs interfaces + window augmentation
│
├── services/
│   ├── index.ts              # Re-exports
│   ├── request.ts            # executeEndpoint(), get3DSpaceUrl(), getCsrfToken()
│   ├── query-factory.ts      # createQueryOptions(), createInfiniteQueryKey()
│   ├── mutation-factory.ts   # createMutationFn()
│   └── response-mapper.ts    # mapResponse(), mapSingleResponse()
│
└── types/
    ├── config.ts             # All declarative config types (WidgetConfig, EndpointDefinition, etc.)
    ├── widget.d.ts           # Platform Widget type declarations
    ├── WAFData.d.ts
    ├── PlatformAPI.d.ts
    ├── i3DXCompassServices.d.ts
    ├── DataDragAndDrop.d.ts
    ├── TagNavigatorProxy.d.ts
    └── i3DXCompassPubSub.d.ts
```

---

## Platform Type Declarations

All 3DExperience platform types live in `src/types/`. The primary composite interface is:

```ts
interface DSPlatformAPIs {
  PlatformAPI: PlatformAPI;
  WAFData: WAFData;
  i3DXCompassServices: I3DXCompassServices;
  DataDragAndDrop: DataDragAndDrop;
  UWA_Core: unknown;
  UWA_Utils_InterCom: InterCom;
  WebappsUtils: WebappsUtils;
}
```

`window.widget`, `window.UWA`, and `window.requirejs` are declared in `src/lib/widget/types.ts` via a `declare global` block.

---

## Environment Variables

Managed with **@t3-oss/env-core** (`src/lib/env.ts`). Must be prefixed with `VITE_`.

| Variable                | Default                         | Purpose                                                                            |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| `VITE_WIDGET_BASE_PATH` | `/3ddashboard/api/widget/frame` | TanStack Router `basepath` — must match where 3DDashboard serves the widget iframe |

Set values in `.env`. Do not mutate `import.meta.env` directly.

---

## Routing

Uses **TanStack Router** with **file-based routing** (plugin: `@tanstack/router-plugin/vite`).

- `routeTree.gen.ts` is **auto-generated** — never edit it manually. It regenerates when you add/edit files in `src/routes/`.
- The router `basepath` is set from `env.VITE_WIDGET_BASE_PATH` — required because the widget is served at a sub-path inside 3DDashboard.
- Router context passes `queryClient` down for TanStack Query loaders.
- `__root.tsx` wraps everything in `<TanStackQueryProvider>` and `<TanStackRouterDevtools>`.

**To add a route**, create a new file in `src/routes/`. E.g. `src/routes/my-page.tsx`.

---

## Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed.
- **Shadcn/ui** components in `src/components/ui/`. Add new ones with:
  ```bash
  pnpm dlx shadcn@latest add <component-name>
  ```
- **`cn(...)`** utility (`src/lib/utils.ts`) merges Tailwind classes using `clsx` + `tailwind-merge`. Always use it for conditional class composition.
- Indentation: **tabs** (enforced by Biome).
- Quotes: **double** (enforced by Biome).

---

## Logger

Use the **singleton logger** instead of `console.*`:

```ts
import { logger } from '@/lib/logger';

logger.info('Widget started'); // blue
logger.warn('Possible issue'); // amber
logger.error('Something failed', err); // red
logger.debug('Dev-only detail'); // green — only fires in DEV mode
```

`debug()` is silenced in production (`import.meta.env.DEV` guard).

---

## Linting & Formatting

**Biome** (`biome.json`) is the single tool for both linting and formatting. Key settings:

- Indent: **tab** / Quotes: **double**
- `noExplicitAny`: **warn** (avoid `any`, type properly)
- `noNonNullAssertion`: **warn** (avoid `!`, use guards)
- `noArrayIndexKey`: **warn**
- Organise imports automatically on save (`assist.actions.source.organizeImports: "on"`)

Run `npm run check` before committing.

---

## Testing

Uses **Vitest** with **jsdom** + **@testing-library/react**.

```bash
npm run test      # run all tests once
```

Tests live alongside source files or in a `__tests__/` folder. Import test utilities from `@testing-library/react`.

---

## index.html — Widget Metadata

The `index.html` is the widget descriptor file. It uses `xmlns:widget` to declare **widget preferences** (user-configurable settings surfaced in 3DDashboard's edit panel):

```html
<widget:preferences>
  <widget:preference
    type="text"
    name="Title"
    label="Title"
    defaultValue="Widget Template"
  />
  <widget:preference
    type="list"
    name="Type"
    label="Type"
    defaultValue="VPMReference"
  >
    <widget:option
      value="VPMReference"
      label="Physical Product"
    ></widget:option>
  </widget:preference>
</widget:preferences>
```

Read widget preferences at runtime via:

```ts
const title = widget.getValue('Title');
```

The inline `<script>` in `<head>` dynamically loads 3DS UWA CSS files (`UIKIT.css`, `wux.css`, `wux-3ds-fonticons.css`) from `UWA.hosts.uwa`.

---

## Common Patterns & Gotchas

### Adding a New Endpoint

1. Create a file in `src/config/endpoints/` that exports an `EndpointDefinition` object.
2. Use `{{paramName}}` template syntax in the URL for dynamic path segments.
3. Set `requiresCsrf: true` for POST/PATCH/PUT/DELETE calls.
4. Add `responseMapping` to rename `ds6w:` prefixed keys from 3DSpace responses.

### Adding a New Widget

1. Create `src/config/widgets/my-widget.ts` with a `WidgetConfig` object.
2. Register it in `src/config/widgets/index.ts`:
   ```ts
   const WIDGET_CONFIGS: Record<string, WidgetConfig> = {
     'my-widget': myWidgetConfig,
   };
   ```
3. Use `getWidgetConfig("my-widget")` anywhere to retrieve it.

### Preventing "Widget not initialized" Errors

- Never call `getAPIs()`, `getWidget()`, or `getUWA()` at module top-level.
- They are only safe after `init()` returns (i.e., inside event handlers, query functions, or React callbacks/effects that run after mount).

### WAFData Response Parsing

`WAFData.authenticatedRequest` returns raw JSON **strings** in its `onComplete` callback, not objects. The `request.ts` executor handles `JSON.parse` automatically. Custom code must also parse manually if calling `authenticatedRequest` directly.

### CSRF Token

Required for all non-GET requests to 3DSpace. The `executeEndpoint` function handles this if `requiresCsrf: true` is set in the endpoint definition. The token is cached for 5 minutes (`CSRF_TTL`).

### RequireJS / No ESM for Platform Modules

Platform modules (`DS/...`, `UWA/...`) are AMD, not ESM. Do **not** `import` them. Only access them via:

- `getModule<T>("module-key")` after `loadModules(...)` completes
- Or `getAPIs()` for the standard set

---

## Architecture Diagram (Text)

```
3DDashboard (Platform)
  └─ iframe → index.html
       └─ src/main.tsx
            ├─ waitFor(window.widget)          [polls ~100ms interval]
            ├─ widget.addEvent("onLoad")
            │    ├─ loadModules([...])          [window.requirejs → AMD]
            │    │    └─ registerModule(key, mod) [in-memory Map]
            │    ├─ init(apis, widget, UWA)     [global singletons]
            │    └─ ReactDOM.createRoot          [React app starts]
            │         └─ <WidgetProvider>
            │              └─ <RouterProvider>   [TanStack Router]
            │                   └─ <Routes>
            │                        └─ <WidgetShell config={...}>
            │                             ├─ <ObjectHeader>
            │                             ├─ <DropZone>
            │                             ├─ <TabManager>
            │                             │    └─ <TabContentRenderer>
            │                             │         ├─ <DataTable>    (type: "table")
            │                             │         ├─ <DynamicForm>  (type: "form")
            │                             │         └─ custom         (type: "custom")
            │                             └─ <SidePanel>
            └─ widget.addEvent("onRefresh") → window.location.reload()
```

---

## Second Template — `vite-typescript-tailwind-template/client`

This is the **older reference implementation**. Key differences from the primary template:

| Aspect                | Primary (tanstack-start)     | Legacy (vite-tailwind)                         |
| --------------------- | ---------------------------- | ---------------------------------------------- |
| Router                | TanStack Router (file-based) | React Router DOM v6 (code-based)               |
| State                 | TanStack Query only          | TanStack Query + Redux Toolkit + redux-persist |
| AMD loading           | `loadModules()` → registry   | Inline `window.requirejs(...)` in `main.tsx`   |
| API class             | Singleton functions          | `Api` class + `ServiceCaller` class            |
| Build output          | `dist/` with hashed assets   | `build/build.js` (single file)                 |
| TypeScript strictness | Very strict (noExplicitAny)  | Loose (`any` common)                           |
| Formatter             | Biome                        | ESLint + Prettier                              |
| React version         | React 19                     | React 18                                       |

The legacy template uses `src/lib/serviceCaller.ts` for service orchestration and stores preferences via `preference_*` utilities in `src/lib/util/preferencesUtil`.
