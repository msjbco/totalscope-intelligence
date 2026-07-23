# TotalScope Intelligence

A production-ready Next.js 15 foundation for an executive property-insurance intelligence platform.

## Architecture

- `app/` contains route-level composition using the App Router.
- `components/dashboard/` owns the responsive application shell and reusable module layouts.
- `components/ui/` contains presentation primitives such as KPI, chart, status, and section cards.
- `lib/` is reserved for framework-agnostic domain utilities.
- `hooks/` contains reusable client-side behavior.
- `types/` defines shared domain contracts.
- `public/` stores static brand and social assets.
- `styles/` documents the styling boundary; global tokens and primitives live in `app/globals.css`.

Feature pages provide their domain-specific data to `ModulePage`, keeping layout and interaction consistent without coupling future data services to UI primitives.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run build
npm run lint
```

The included `netlify.toml` configures the official Next.js adapter for Netlify.
