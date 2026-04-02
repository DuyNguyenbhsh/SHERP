# SH-GROUP WMS/ERP Frontend

## Project Identity

This is the frontend application for **SH-GROUP Warehouse Management System (WMS/ERP)**.
It provides a modern, responsive web interface for warehouse operations, procurement,
inventory management, and enterprise resource planning.

## Tech Stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Framework        | React 19                                     |
| Build Tool       | Vite 7                                       |
| Language         | TypeScript 5.9 (strict mode)                 |
| Styling          | Tailwind CSS + Shadcn UI                     |
| State / Caching  | TanStack Query (React Query)                 |
| HTTP Client      | Axios                                        |
| Routing          | React Router DOM v7                          |
| Charts           | Recharts                                     |

## Architecture — Feature-Sliced Design (FSD)

All source code lives under `src/` and follows **Feature-Sliced Design** layers:

```
src/
├── app/            # App-level: providers, router, global styles, entry point
├── pages/          # Compositional layer: full page components (one per route)
├── widgets/        # Complex composite blocks (e.g., header, sidebar, data tables)
├── features/       # User interactions & business actions (e.g., create-order, filter-products)
├── entities/       # Business domain models (e.g., product, warehouse, order)
├── shared/         # Reusable utilities, UI kit, API client, types, constants
│   ├── api/        #   Axios instance, interceptors, endpoint helpers
│   ├── ui/         #   Shared/base UI components (Shadcn wrappers, etc.)
│   ├── lib/        #   Utility functions, helpers
│   ├── types/      #   Global/shared TypeScript types & interfaces
│   └── constants/  #   App-wide constants and enums
```

### FSD Rules

1. **Import direction**: Upper layers may import from lower layers, never the reverse.
   `app → pages → widgets → features → entities → shared`
2. **No cross-imports within the same layer** (e.g., one feature must not import from another feature directly — extract to `entities/` or `shared/`).
3. **Each slice is self-contained**: every feature/entity folder has its own `index.ts` public API barrel file.
4. **Colocation**: tests, types, and hooks that belong to a slice live inside that slice.

## Coding Standards

### TypeScript

- **Strict mode is mandatory** — `strict: true` in `tsconfig.app.json`.
- **No `any`** — use `unknown` + type guards, generics, or proper interfaces.
- **Prefer `interface` over `type`** for object shapes (use `type` for unions/intersections).
- **Explicit return types** on exported functions and hooks.

### React

- **Functional components only** — no class components.
- **Custom hooks** for all business logic — components should be thin UI shells.
- **Named exports** for all components (no default exports).
- **Props interfaces** defined above the component in the same file, suffixed with `Props`.

### General

- **DRY** — extract repeated logic into `shared/lib/` or appropriate entity/feature hooks.
- **Single Responsibility** — one component/hook per file. Files should not exceed ~200 lines.
- **Immutable data patterns** — never mutate state directly.
- **Barrel exports** — each module folder has an `index.ts` that re-exports its public API.

## Scripts (Self-Correction Guardrails)

Run these before every commit and after significant changes:

```bash
npm run lint          # ESLint — catch code quality issues
npm run lint:fix      # ESLint — auto-fix what's possible
npm run type-check    # TypeScript compiler — catch type errors
npm run format        # Prettier — format all files
npm run format:check  # Prettier — check formatting without writing
npm run build         # Full production build — final validation
```

## Commit Conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:`
- Keep commits atomic and focused on a single change.

## Environment

- Node.js >= 20
- Package manager: npm
- Dev server: `npm run dev` (Vite)
