# CLAUDE.md — tanstack-start-widget-template

Detailed context and guidelines for the `tanstack-start-widget-template` repository.

## 🚀 Build and Test

- **Build**: `npm run build`
- **Dev (Widget)**: `npm run dev:widget` (Runs on port 3999, optimized for 3DEXPERIENCE)

## 🏗️ Project Structure

```text
src/
├── components/
│   ├── data-grid/      # Custom Table Engine (TableEngine, api-executor)
│   ├── dnd/            # Drag and drop utilities
│   ├── layout/         # Base layout components
│   └── ui/             # shadcn/ui primitives
├── features/           # Modular business logic (e.g., xen)
├── hooks/              # Shared React hooks
├── lib/                # Shared utilities and 3DEXPERIENCE API types
├── routes/             # File-based routing (TanStack Router)
└── services/           # WAF and Platform API abstractions
docs/
└── plans/              # Implementation plans and design docs
```

## 🛠️ Tech Stack

- **Framework**: React 19
- **Routing**: TanStack Router (File-based)
- **Tables**: TanStack Table v8 (via custom Table Engine)
- **State**: TanStack Query v5
- **Styling**: Tailwind CSS v4 + Glassmorphism
- **UI**: shadcn/ui components (src/components/ui/)
- **Logic**: TypeScript + Biome (linting/formatting)

## 🏗️ Architectural Patterns

- **Table Engine**: Tables MUST be configuration-driven. Configs go in `src/features/[feature]/configs/`.
- **WAF Auth**: All platform requests MUST use the custom `httpClient` from `src/services/http/` to handle CSRF and authentication properly.
- **Tabs**: Prefer declarative tab management (e.g., `<Tabs defaultValue="...">`) over manually managed `useState`.
- **Imports**: Use absolute imports with `#/*` (mapped to `src/*`).

## 🛤️ Standard Workflow

1. **Investigate**: Check if there's an existing plan in `docs/plans/` or if research is needed.
2. **Plan**: For multi-step tasks, use `/write-plan` to create a plan in `docs/plans/`.
3. **Execute**: Use `/execute-plan` (from `executing-plans` skill) for structured implementation.
4. **Verify**: Run `npm run check` and `npm run build` after changes.

## 🎨 Styling & UI

- **Design**: Glassmorphism (`bg-background/80 backdrop-blur-md`).
- **Icons**: Always use `lucide-react`.
- **Theme**: Supports light/dark modes via Tailwind variables in `src/index.css`.

---

_Last Updated: 2026-03-13_
