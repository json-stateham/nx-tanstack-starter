# nx-tanstack-starter

A full-stack React admin starter built with TanStack, Nx, and modern tooling. SSR-ready out of the box.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — full-stack SSR framework
- **[TanStack Router](https://tanstack.com/router)** — file-based, fully type-safe routing
- **[TanStack Query](https://tanstack.com/query)** — server state & caching
- **[Nx](https://nx.dev)** — monorepo orchestration with build caching
- **[Vite](https://vitejs.dev)** — dev server & bundler
- **[Tailwind CSS](https://tailwindcss.com)** — utility-first styling
- **[shadcn/ui](https://ui.shadcn.com)** (new-york) — accessible UI primitives via Radix UI
- **[i18next](https://www.i18next.com)** — i18n with 6 languages (en, ru, ar, cn, ja, es)
- **TypeScript 5.9** strict mode throughout

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) 9+

## Getting started

```bash
pnpm install
pnpm admin        # dev server → http://localhost:4200
```

```bash
pnpm build:admin  # production build → dist/apps/admin
pnpm typecheck    # type-check only, no emit
```

## Project structure

```
apps/
└── admin/
    └── src/
        ├── routes/          # File-based routes (auto-generates routeTree.gen.ts)
        ├── components/ui/   # shadcn-style primitives
        ├── lib/             # i18n instance, cn() utility
        └── locales/         # Translation files (en, ru, ar, cn, ja, es)
libs/                        # Shared libraries (empty, path-aliased and ready)
```

## Adding routes

Create a file in `apps/admin/src/routes/`. TanStack Router generates the route tree automatically.

```
routes/
├── __root.tsx        # Root layout (providers)
├── index.tsx         # /
├── users.tsx         # /users
└── users/
    └── $id.tsx       # /users/:id
```

## Adding shadcn components

`shadcn add` doesn't work in this monorepo layout. Copy the component source from [ui.shadcn.com](https://ui.shadcn.com/docs/components) into `src/components/ui/`, then install the required Radix package:

```bash
pnpm add @radix-ui/<package-name>
```

## i18n

All display strings go through `useTranslation()`. When adding a key, update **all 6 locale files** in `src/locales/`.

```tsx
const { t } = useTranslation();
t('home.nav.overview')

// For keys containing HTML:
<Trans i18nKey="home.workspace.description" components={{ code: <code /> }} />
```

Switch language at runtime: `i18n.changeLanguage('ru')`.

## Planned libs

`tsconfig.base.json` already aliases three shared libraries when you create them:

| Alias | Path |
|-------|------|
| `@proj/ui` | `libs/ui/src/index.ts` |
| `@proj/shared` | `libs/shared/src/index.ts` |
| `@proj/types` | `libs/types/src/index.ts` |

## License

MIT
