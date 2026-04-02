# WMS Frontend - AI Coding Agent Instructions

## Project Overview
**WMS Frontend** is a React 19 + TypeScript + Vite frontend application for a Warehouse Management System. This is a modern, type-safe single-page application using Ant Design for UI components.

## Architecture

### Tech Stack
- **Framework**: React 19.2.0 with TypeScript 5.9.3
- **Build Tool**: Vite 7.3.1 with React plugin (uses Babel for Fast Refresh)
- **UI Library**: Ant Design 6.3.0 with @ant-design/icons
- **HTTP Client**: Axios 1.13.5
- **Linting**: ESLint 9.39.1 (flat config) + TypeScript ESLint

### Project Structure
```
src/
  ├── App.tsx          # Root component (currently empty - ready for implementation)
  ├── App.css          # Root component styles
  ├── main.tsx         # React entry point (createRoot setup)
  ├── index.css        # Global styles
  └── assets/          # Static assets
```

The application entry point is [index.html](index.html) → [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx).

## Development Workflow

### Essential Commands
- `npm run dev` - Start Vite dev server with HMR (Hot Module Replacement)
- `npm run build` - Build for production (runs `tsc -b` then `vite build`)
- `npm run lint` - Check code with ESLint
- `npm run preview` - Preview production build locally

### Build Process
The build is two-step: TypeScript compilation first (`tsc -b` using incremental build), then Vite bundling. This ensures type checking passes before bundling.

### Vite Configuration
- Uses `@vitejs/plugin-react` for Fast Refresh (file changes update without full reload)
- No React Compiler enabled (due to performance impact on dev/build)
- Configuration is minimal in [vite.config.ts](vite.config.ts)

## Code Conventions

### TypeScript Strict Mode
- **All files use strict TypeScript** - non-null assertions, unused variable checks, no implicit any
- [tsconfig.app.json](tsconfig.app.json) enforces: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Use explicit types; avoid `any` type
- The `!` non-null assertion operator should only be used when you're certain (e.g., `document.getElementById('root')!`)

### JSX Configuration
- Modern JSX transform enabled (`jsx: "react-jsx"`)
- Import React automatically—no need for `import React from 'react'`
- Target ES2022 with ESNext module resolution

### Import Paths
- Use relative imports from `src/` (e.g., `import App from './App'`)
- ESLint enforces React Hooks rules and React Refresh safety

### Component Structure
When creating new components:
1. Use functional components with hooks
2. Place components and styles in logical groupings under `src/`
3. Use Ant Design components (Button, Form, Table, Modal, etc.) for consistent UI
4. Apply styling with CSS modules or `App.css` approach

## Linting & Code Quality

### ESLint Rules
- ESLint 9 uses flat config (`eslint.config.js`)
- Active plugins: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- React Hooks rules enforced (dependencies in useEffect, etc.)
- React Refresh safety checks (can't use HOCs)

Before committing, run:
```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

## Dependencies & Integration

### Ant Design Usage
- Import components: `import { Button, Form, Table } from 'antd'`
- Import icons: `import { UserOutlined } from '@ant-design/icons'`
- No custom UI framework needed—use Ant Design for consistency

### HTTP Requests (Axios)
- Use Axios for all backend communication
- Assume backend is available (configuration expected in App or provider)
- Handle loading/error states appropriately

## Important Patterns

### React 19 Features
- Use the new form hooks and error handling capabilities if available
- StrictMode enabled in production (catches side effects in development)

### Type Safety
- Always type component props with TypeScript interfaces
- Use `React.FC<Props>` or functional type for components
- Avoid prop spread without proper typing

## Common Tasks

**Creating a new component:**
1. Create `src/components/MyComponent.tsx` with TypeScript
2. Define props interface clearly
3. Import Ant Design components as needed
4. Add type annotations throughout

**Adding styles:**
- Import CSS files in components: `import './MyComponent.css'`
- Use CSS modules or plain CSS (decision left to developer)
- Keep styles scoped to component concerns

**Running tests:**
- Testing setup not yet configured (consider adding Jest/Vitest when needed)

---

*Last updated: February 2026*
