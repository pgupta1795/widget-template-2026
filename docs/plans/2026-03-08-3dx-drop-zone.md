# 3DX Object Drop Zone Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a generic `use3dxDropZone` hook and visual overlay for receiving 3DX platform object drops, wired into the API Explorer to auto-fill path/body params containing `id`.

**Architecture:** Three layers — a pure `extract-3dx-object` utility parses the 3DXContent protocol payload and logs all drop data; a generic `use3dxDropZone` hook registers any DOM element with the 3DX `DataDragAndDrop` platform API; a `DropZoneOverlay` component provides the visual feedback. `@dnd-kit/core`'s `DndContext` is added at the root for internal widget DnD extensibility. The API Explorer consumes the hook and auto-fills params on drop.

**Tech Stack:** React 19, TypeScript 5, `@dnd-kit/core` v6, 3DX `DataDragAndDrop` platform API (via `getAPIs().DataDragAndDrop`), Tailwind CSS v4, TanStack Router

**3DX Drop Payload Shape:**
```json
{
  "protocol": "3DXContent",
  "data": {
    "items": [{ "objectId": "...", "objectType": "...", ...more }]
  }
}
```
Data comes through `DataDragAndDrop.droppable()` → `drop(dataTransfer, element, event)` → iterate `dataTransfer.types` → `dataTransfer.getData(type)` → parse JSON.

---

### Task 1: Create `src/lib/dnd/extract-3dx-object.ts`

**Files:**
- Create: `src/lib/dnd/extract-3dx-object.ts`

**Step 1: Write the file**

```ts
const PROTOCOL = '3DXContent';

export interface DropItem {
  objectId: string;
  objectType: string;
  [key: string]: unknown;
}

export interface ExtractResult {
  /** Primary objectId (first item). Null if extraction failed. */
  id: string | null;
  /** All dropped items */
  items: DropItem[];
  /** Full parsed payload for logging/debugging */
  rawData: unknown;
}

/**
 * Parse and log a 3DXContent dataTransfer payload.
 * Tries every dataTransfer type, logs all content, returns structured result.
 */
export function extract3dxObject(dataTransfer: DataTransfer | null): ExtractResult {
  if (!dataTransfer) {
    console.warn('[DropZone] dataTransfer is null');
    return { id: null, items: [], rawData: null };
  }

  // Log all available types
  console.group('[DropZone] Dropped object — dataTransfer inspection');
  console.log('Available types:', [...dataTransfer.types]);
  let rawString: string | null = null;
  for (const type of dataTransfer.types) {
    try {
      const data = dataTransfer.getData(type);
      console.log(`  [${type}]:`, data);
      if (!rawString && data) rawString = data;
    } catch (e) {
      console.warn(`  [${type}]: failed to read —`, e);
    }
  }
  console.groupEnd();

  if (!rawString) {
    console.warn('[DropZone] No data extracted from dataTransfer');
    return { id: null, items: [], rawData: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawString);
  } catch {
    console.warn('[DropZone] dataTransfer data is not valid JSON:', rawString);
    return { id: null, items: [], rawData: rawString };
  }

  console.log('[DropZone] Full parsed payload:', JSON.stringify(parsed, null, 2));

  const dnd = parsed as Record<string, unknown>;
  if (dnd.protocol !== PROTOCOL) {
    console.warn(`[DropZone] Unexpected protocol: "${dnd.protocol}" (expected "${PROTOCOL}")`);
  }

  const data = dnd.data as Record<string, unknown> | undefined;
  const items: DropItem[] = Array.isArray(data?.items) ? (data.items as DropItem[]) : [];

  console.log('[DropZone] Extracted items:', items);
  return {
    id: items[0]?.objectId ?? null,
    items,
    rawData: parsed,
  };
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors (pre-existing errors for `openApiParser` and `main.tsx` are acceptable).

**Step 3: Commit**

```bash
git add src/lib/dnd/extract-3dx-object.ts
git commit -m "feat: add 3DXContent dataTransfer extraction utility"
```

---

### Task 2: Create `src/hooks/use-3dx-drop-zone.ts`

**Files:**
- Create: `src/hooks/use-3dx-drop-zone.ts`

**Step 1: Write the file**

```ts
import { getAPIs } from '@/lib/widget/api';
import { extract3dxObject, type ExtractResult } from '@/lib/dnd/extract-3dx-object';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface Use3dxDropZoneOptions {
  /** Called when a 3DX object is successfully dropped. */
  onDrop: (result: ExtractResult) => void;
  /** Called when drag enters the zone. */
  onEnter?: () => void;
  /** Called when drag leaves the zone. */
  onLeave?: () => void;
}

export interface Use3dxDropZoneReturn<T extends HTMLElement> {
  ref: RefObject<T>;
  isDragOver: boolean;
}

/**
 * Generic hook for receiving 3DX platform object drops.
 *
 * Registers the referenced element with the 3DX DataDragAndDrop platform API.
 * On drop, extracts and logs the 3DXContent payload, then calls `onDrop`.
 *
 * Works alongside @dnd-kit/core for internal widget DnD — the two systems
 * operate on separate event channels and do not interfere.
 *
 * Gracefully no-ops when running outside the 3DX platform (e.g. local dev).
 *
 * @example
 * const { ref, isDragOver } = use3dxDropZone<HTMLDivElement>({
 *   onDrop: ({ id }) => console.log('dropped id:', id),
 * });
 * return <div ref={ref} className="relative">{isDragOver && <DropZoneOverlay />}</div>;
 */
export function use3dxDropZone<T extends HTMLElement>(
  options: Use3dxDropZoneOptions,
): Use3dxDropZoneReturn<T> {
  const ref = useRef<T>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options; // keep callbacks stable without re-registering

  const register = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    let dnd: ReturnType<typeof getAPIs>['DataDragAndDrop'];
    try {
      dnd = getAPIs().DataDragAndDrop;
    } catch {
      console.warn('[use3dxDropZone] DataDragAndDrop not available (running outside 3DX platform)');
      return;
    }

    dnd.droppable(el, {
      enter: () => {
        setIsDragOver(true);
        optionsRef.current.onEnter?.();
      },
      leave: () => {
        setIsDragOver(false);
        optionsRef.current.onLeave?.();
      },
      over: () => undefined, // allow all drops
      drop: (dataTransfer) => {
        setIsDragOver(false);
        const result = extract3dxObject(dataTransfer);
        optionsRef.current.onDrop(result);
      },
    });

    return () => {
      try {
        getAPIs().DataDragAndDrop.clean(el, 'drop');
      } catch {
        // Platform may be gone during unmount — safe to ignore
      }
    };
  }, []); // stable: no deps, uses ref + optionsRef

  useEffect(() => {
    const cleanup = register();
    return cleanup;
  }, [register]);

  return { ref, isDragOver };
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/hooks/use-3dx-drop-zone.ts
git commit -m "feat: add use3dxDropZone hook for 3DX platform object drops"
```

---

### Task 3: Create `src/components/dnd/drop-zone-overlay.tsx`

**Files:**
- Create: `src/components/dnd/drop-zone-overlay.tsx`

**Step 1: Write the file**

```tsx
import { cn } from '@/lib/utils';

interface DropZoneOverlayProps {
  isDragOver: boolean;
  label?: string;
  className?: string;
}

/** The 3DX-style "drop here" icon — two overlapping rectangles with a drop arrow */
function DropHereIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={cn('w-12 h-12 text-primary', className)}
      aria-hidden="true"
    >
      {/* Back rectangle (dashed) */}
      <rect
        x="6" y="12" width="28" height="22"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 2"
        fill="none"
        opacity="0.4"
      />
      {/* Front rectangle */}
      <rect
        x="14" y="18" width="28" height="22"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="hsl(var(--background))"
      />
      {/* Drop arrow */}
      <path
        d="M28 22 L28 32 M24 28 L28 32 L32 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Absolutely-positioned overlay that appears when dragging a 3DX object over the drop zone.
 * The parent element MUST have `position: relative` (add `className="relative"`).
 *
 * @example
 * <div className="relative flex-1">
 *   <DropZoneOverlay isDragOver={isDragOver} label="Drop here to load object" />
 *   {children}
 * </div>
 */
export function DropZoneOverlay({ isDragOver, label = 'Drop here', className }: DropZoneOverlayProps) {
  if (!isDragOver) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        'absolute inset-0 z-50',
        'border-2 border-dashed border-primary rounded-sm',
        'bg-background/80 backdrop-blur-[1px]',
        'flex flex-col items-center justify-center gap-3',
        'pointer-events-none',
        className,
      )}
    >
      <DropHereIcon />
      <span className="text-sm text-muted-foreground font-medium select-none">{label}</span>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/components/dnd/drop-zone-overlay.tsx
git commit -m "feat: add DropZoneOverlay component for drag visual feedback"
```

---

### Task 4: Create `src/components/dnd/drop-zone-provider.tsx`

**Files:**
- Create: `src/components/dnd/drop-zone-provider.tsx`

**Step 1: Write the file**

```tsx
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DndContextProps,
} from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DropZoneProviderProps {
  children: ReactNode;
  /** Forward any dnd-kit DndContext props for internal widget DnD customisation. */
  dndContextProps?: Omit<DndContextProps, 'sensors' | 'children'>;
}

/**
 * App-level dnd-kit DndContext.
 *
 * Provides the React context required by any @dnd-kit useDraggable / useDroppable
 * hooks used for internal widget DnD (reordering, sidebar items, etc.).
 *
 * Note: Does NOT interfere with the 3DX DataDragAndDrop API, which operates
 * on native browser drag events independently of dnd-kit's synthetic event system.
 */
export function DropZoneProvider({ children, dndContextProps }: DropZoneProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // prevent accidental drags on click
    }),
    useSensor(KeyboardSensor),
  );

  return (
    <DndContext sensors={sensors} {...dndContextProps}>
      {children}
    </DndContext>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/components/dnd/drop-zone-provider.tsx
git commit -m "feat: add DropZoneProvider wrapping app-level dnd-kit DndContext"
```

---

### Task 5: Add `DropZoneProvider` to root route

**Files:**
- Modify: `src/routes/__root.tsx`

Current content:
```tsx
import {AppShell} from "@/components/layout/app-shell";
import TanStackQueryProvider from "@/components/root-provider";
import {Toaster} from "@/components/ui/sonner";
import type {QueryClient} from "@tanstack/react-query";
import {createRootRouteWithContext} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route=createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <TanStackQueryProvider>
      <AppShell />
      <Toaster position="top-right" closeButton />
      <TanStackRouterDevtools />
    </TanStackQueryProvider>
  );
}
```

**Step 1: Add DropZoneProvider import and wrap AppShell**

Add import after TanStackQueryProvider import:
```ts
import {DropZoneProvider} from "@/components/dnd/drop-zone-provider";
```

Replace `RootComponent` body:
```tsx
function RootComponent() {
  return (
    <TanStackQueryProvider>
      <DropZoneProvider>
        <AppShell />
        <Toaster position="top-right" closeButton />
        <TanStackRouterDevtools />
      </DropZoneProvider>
    </TanStackQueryProvider>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: add DropZoneProvider to root route for app-level dnd-kit context"
```

---

### Task 6: Wire drop zone into API Explorer

Two edits: (A) context gets `onObjectDrop` handler, (B) component applies hook + overlay.

**Files:**
- Modify: `src/features/api-explorer/context/api-explorer-context.tsx`
- Modify: `src/features/api-explorer/components/api-explorer.tsx`

#### Part A — `api-explorer-context.tsx`

**Step 1: Add import at top of file**

After existing imports, add:
```ts
import { type ExtractResult } from '@/lib/dnd/extract-3dx-object';
```

**Step 2: Add `onObjectDrop` to `ApiExplorerContextType` interface**

Add after `loadHistoryEntry`:
```ts
onObjectDrop: (result: ExtractResult) => void;
```

**Step 3: Add `fillIdFields` pure helper above `ApiExplorerProvider`**

```ts
/** Recursively replace string values of object keys containing 'id' (case-insensitive). */
function fillIdFields(obj: unknown, id: string): unknown {
  if (Array.isArray(obj)) return obj.map(v => fillIdFields(v, id));
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = k.toLowerCase().includes('id') && typeof v === 'string'
        ? id
        : fillIdFields(v, id);
    }
    return result;
  }
  return obj;
}
```

**Step 4: Add `onObjectDrop` handler inside `ApiExplorerProvider`** (after `loadHistoryEntry` useCallback)

```ts
const onObjectDrop = useCallback((result: ExtractResult) => {
  const { id, items } = result;
  if (!id) {
    console.warn('[ApiExplorer] Drop received but no objectId could be extracted');
    return;
  }
  console.log(`[ApiExplorer] Object dropped — id: ${id}`, items);

  // Auto-fill path params whose key contains 'id' (case-insensitive)
  setPathParams(prev =>
    prev.map(p =>
      p.key.toLowerCase().includes('id') ? { ...p, value: id } : p,
    ),
  );

  // Auto-fill body JSON: replace string values of keys containing 'id'
  setBody(prev => {
    if (!prev.trim()) return prev;
    try {
      const parsed = JSON.parse(prev);
      const updated = fillIdFields(parsed, id);
      return JSON.stringify(updated, null, 2);
    } catch {
      return prev; // body is not JSON — leave as-is
    }
  });
}, []);
```

**Step 5: Add `onObjectDrop` to context value** at the bottom of the return's value object:
```ts
onObjectDrop,
```

#### Part B — `api-explorer.tsx`

**Step 1: Add imports**

```ts
import { use3dxDropZone } from '@/hooks/use-3dx-drop-zone';
import { DropZoneOverlay } from '@/components/dnd/drop-zone-overlay';
```

**Step 2: Split into inner component to allow `useApiExplorer()` inside provider**

Replace the entire file content with:

```tsx
import { createPortal } from 'react-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Clock,Globe,Layers} from 'lucide-react';
import {useSidebarSlot} from '@/components/layout/sidebar-slot-context';
import {use3dxDropZone} from '@/hooks/use-3dx-drop-zone';
import {DropZoneOverlay} from '@/components/dnd/drop-zone-overlay';
import {ApiExplorerProvider} from '../context/api-explorer-context';
import {useApiExplorer} from '../context/api-explorer-context';
import {RequestPanel} from './request/request-panel';
import {ResponsePanel} from './response/response-panel';
import {CollectionTree} from './sidebar/collection-tree';
import {HistoryPanel} from './sidebar/history-panel';
import {SpecBrowser} from './sidebar/spec-browser';

function ExplorerSidebarContent() {
  return (
    <SidebarGroup className="flex-1 overflow-hidden p-0 min-h-0 gap-0">
      <SidebarGroupContent className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Tabs defaultValue="active" className="flex-1 flex flex-col gap-0 overflow-hidden">
          <TabsList
            variant="line"
            className="w-full rounded-none border-b border-border h-9 px-2 justify-start gap-0 shrink-0"
          >
            <TabsTrigger value="active" className="gap-1 text-[11px]">
              <Layers size={12} /> Active
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-1 text-[11px]">
              <Globe size={12} /> Browse
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-[11px]">
              <Clock size={12} /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="pt-2">
                <CollectionTree />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="browse" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="pt-2">
                <SpecBrowser />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="pt-2">
                <HistoryPanel />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** Inner component — must live inside ApiExplorerProvider to use context. */
function ApiExplorerContent() {
  const { slotEl } = useSidebarSlot();
  const { onObjectDrop } = useApiExplorer();

  const { ref, isDragOver } = use3dxDropZone<HTMLDivElement>({
    onDrop: onObjectDrop,
  });

  return (
    <>
      {slotEl && createPortal(<ExplorerSidebarContent />, slotEl)}
      <div ref={ref} className="relative h-full">
        <DropZoneOverlay isDragOver={isDragOver} label="Drop object to load ID" />
        <ResizablePanelGroup orientation="vertical" className="h-full">
          <ResizablePanel defaultSize={55} minSize={25}>
            <RequestPanel />
          </ResizablePanel>
          <ResizableHandle className="bg-border hover:bg-primary/30 transition-colors data-resize-handle-active:bg-primary/50" />
          <ResizablePanel defaultSize={45} minSize={20}>
            <ResponsePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}

export function ApiExplorer() {
  return (
    <ApiExplorerProvider>
      <ApiExplorerContent />
    </ApiExplorerProvider>
  );
}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/features/api-explorer/context/api-explorer-context.tsx \
        src/features/api-explorer/components/api-explorer.tsx
git commit -m "feat: wire 3DX object drop zone into API Explorer with auto-fill path/body params"
```

---

### Task 7: Add barrel exports

**Files:**
- Create: `src/lib/dnd/index.ts`
- Create: `src/components/dnd/index.ts`

**Step 1: `src/lib/dnd/index.ts`**

```ts
export { extract3dxObject } from './extract-3dx-object';
export type { ExtractResult, DropItem } from './extract-3dx-object';
```

**Step 2: `src/components/dnd/index.ts`**

```ts
export { DropZoneProvider } from './drop-zone-provider';
export { DropZoneOverlay } from './drop-zone-overlay';
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 4: Commit**

```bash
git add src/lib/dnd/index.ts src/components/dnd/index.ts
git commit -m "chore: add barrel exports for dnd utilities and components"
```

---

### Reference: Using the hook in other routes (e.g. `/xen`)

```tsx
import { use3dxDropZone } from '@/hooks/use-3dx-drop-zone';
import { DropZoneOverlay } from '@/components/dnd';

export function Xen() {
  const { ref, isDragOver } = use3dxDropZone<HTMLDivElement>({
    onDrop: ({ id, items }) => {
      console.log('Xen received drop:', id, items);
      // Handle however this route needs
    },
  });

  return (
    <div ref={ref} className="relative flex h-full items-center justify-center">
      <DropZoneOverlay isDragOver={isDragOver} label="Drop object here" />
      <p className="text-sm text-muted-foreground">XEN — coming soon</p>
    </div>
  );
}
```

No additional root wiring needed — `DropZoneProvider` is already at the root.
