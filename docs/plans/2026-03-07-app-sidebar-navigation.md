# App Sidebar Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-route app with a persistent app-level nav sidebar that routes between features (API Explorer, XEN), while keeping each feature's internal sidebar self-contained.

**Architecture:** A shadcn `SidebarProvider` moves to `__root.tsx` via an `AppShell` component that renders a nav `AppSidebar` + `SidebarInset` containing `<Outlet />`. Each feature route fills `h-full` inside that inset. `ApiExplorer` keeps its own nested `SidebarProvider` for its tabbed feature sidebar. Adding a new route = add to `NAV_ITEMS` + create route file + create feature component.

**Tech Stack:** TanStack Router (file-based), React 19, shadcn/ui sidebar, lucide-react, Tailwind CSS v4.

---

### Task 1: Create XEN feature placeholder

**Files:**
- Create: `src/features/xen/components/xen.tsx`

**Step 1: Create the file**

```tsx
export function Xen() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <p className="text-sm">XEN — coming soon</p>
    </div>
  );
}
```

**Step 2: Verify file exists**

```bash
ls src/features/xen/components/xen.tsx
```

Expected: file listed

**Step 3: Commit**

```bash
git add src/features/xen/components/xen.tsx
git commit -m "feat: add XEN feature placeholder component"
```

---

### Task 2: Create nav items config

**Files:**
- Create: `src/components/layout/nav-items.ts`

**Step 1: Create the file**

```ts
import type { LucideIcon } from 'lucide-react';
import { Globe, Zap } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '3DX API Explorer', icon: Globe },
  { path: '/xen', label: 'XEN', icon: Zap },
];
```

To add a new route in future: append one object to `NAV_ITEMS`.

**Step 2: Commit**

```bash
git add src/components/layout/nav-items.ts
git commit -m "feat: add extendable nav items config"
```

---

### Task 3: Create AppSidebar component

**Files:**
- Create: `src/components/layout/app-sidebar.tsx`

**Step 1: Create the file**

```tsx
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from './nav-items';

export function AppSidebar() {
  const { location } = useRouterState();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                >
                  <Link to={item.path}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
```

Key details:
- `collapsible="icon"` — sidebar collapses to icon-only width
- `tooltip={item.label}` — shadcn shows a tooltip when sidebar is collapsed
- `isActive={isActive}` — highlights the current route
- `<Link to={item.path}>` — TanStack Router link, no page reload

**Step 2: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add AppSidebar nav component with active route highlighting"
```

---

### Task 4: Create AppShell layout component

**Files:**
- Create: `src/components/layout/app-shell.tsx`

**Step 1: Create the file**

```tsx
import { Outlet } from '@tanstack/react-router';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

export function AppShell() {
  return (
    <SidebarProvider className="h-screen overflow-hidden bg-background">
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center px-3 h-9 border-b border-border shrink-0 bg-card/40">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

`SidebarTrigger` here toggles the **app nav sidebar** (not the feature sidebar). Feature sidebars have their own trigger inside their own `SidebarProvider`.

**Step 2: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat: add AppShell layout with nav sidebar and outlet"
```

---

### Task 5: Update __root.tsx to use AppShell

**Files:**
- Modify: `src/routes/__root.tsx`

**Step 1: Read current file first, then replace with**

```tsx
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import TanStackQueryProvider from "@/components/root-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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

Note: `<Outlet />` is removed from here — `AppShell` renders it internally.

**Step 2: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: wire AppShell into root route"
```

---

### Task 6: Fix ApiExplorer height — remove h-screen

**Files:**
- Modify: `src/features/api-explorer/components/api-explorer.tsx`

**Step 1: Read the file, then change one line**

Find:
```tsx
<SidebarProvider className="h-screen overflow-hidden bg-background">
```

Replace with:
```tsx
<SidebarProvider className="h-full overflow-hidden bg-background">
```

Why: `ApiExplorer` is now rendered inside `AppShell`'s `flex-1 overflow-hidden` div. Using `h-screen` would overflow the app shell. `h-full` fills the available space correctly.

**Step 2: Commit**

```bash
git add src/features/api-explorer/components/api-explorer.tsx
git commit -m "fix: use h-full in ApiExplorer SidebarProvider for nested layout"
```

---

### Task 7: Create the /xen route file

**Files:**
- Create: `src/routes/xen.tsx`

**Step 1: Create the file**

```tsx
import { Xen } from '@/features/xen/components/xen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/xen')({ component: Xen });
```

**Step 2: Regenerate routeTree.gen.ts**

The TanStack Router vite plugin auto-regenerates `routeTree.gen.ts` when a route file changes. Run the dev server briefly to trigger regeneration:

```bash
npm run dev
```

Wait for the console to show route tree updated, then stop (`Ctrl+C`).

If you need to update `routeTree.gen.ts` manually (without running dev), add the following to the existing file — but prefer the auto-generation approach:

In `FileRoutesByFullPath`: add `'/xen': typeof XenRoute`
In `FileRoutesByTo`: add `'/xen': typeof XenRoute`
In `FileRoutesById`: add `'/xen': typeof XenRoute`
In `FileRouteTypes.fullPaths`: add `| '/xen'`
In `FileRouteTypes.to`: add `| '/xen'`
In `FileRouteTypes.id`: add `| '/xen'`
In `RootRouteChildren`: add `XenRoute: typeof XenRoute`
Add import: `import { Route as XenRouteImport } from './routes/xen'`
Add: `const XenRoute = XenRouteImport.update({ id: '/xen', path: '/xen', getParentRoute: () => rootRouteImport } as any)`
Add to `rootRouteChildren`: `XenRoute: XenRoute`

**Step 3: Commit**

```bash
git add src/routes/xen.tsx src/routeTree.gen.ts
git commit -m "feat: add /xen route"
```

---

### Task 8: Verify end-to-end in dev

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Check these behaviors**

- App loads at `/` showing API Explorer with both nav sidebar (left, small icons) and API Explorer's tabbed sidebar
- Clicking XEN nav item in app sidebar navigates to `/xen` showing "XEN — coming soon"
- Active nav item is visually highlighted
- Clicking the `SidebarTrigger` (hamburger) in the top bar collapses/expands the nav sidebar
- When nav sidebar is collapsed, only icons show; hovering shows tooltip with label
- API Explorer's internal sidebar trigger (inside the feature) still works independently

**Step 3: Commit if everything looks good**

No new files — just a verification step.

---

## Future Extension

To add a new route/feature:
1. Create `src/features/<name>/components/<name>.tsx`
2. Create `src/routes/<name>.tsx` with `createFileRoute('/<name>')`
3. Add one entry to `NAV_ITEMS` in `src/components/layout/nav-items.ts`
4. Run `npm run dev` to regenerate routeTree
