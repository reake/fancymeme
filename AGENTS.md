# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

fancymeme Template Two is a full-stack Next.js 16 SaaS boilerplate for AI-powered content generation (meme generator with image/audio/music/video/chat capabilities). Built with TypeScript, Drizzle ORM, and Better-auth, supporting multiple payment providers (Stripe, PayPal, Creem) and deployment targets (Vercel, Cloudflare Workers, Docker).

## Essential Commands

### Development

```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm build:fast       # Production build with increased memory
pnpm start            # Start production server
```

### Code Quality

```bash
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting without changes
```

### Database Operations

```bash
pnpm db:generate      # Generate Drizzle migrations (reads from .env.development)
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema changes directly (skip migration files)
pnpm db:studio        # Open Drizzle Studio at https://local.drizzle.studio
```

All db:\* commands use `tsx scripts/with-env.ts` wrapper to load environment variables from `.env.development`.

### Authentication

```bash
pnpm auth:generate    # Generate better-auth migration files
```

### RBAC (Role-Based Access Control)

```bash
pnpm rbac:init        # Initialize RBAC system (create roles/permissions)
pnpm rbac:assign      # Assign roles to users interactively
```

### Cloudflare Deployment

```bash
pnpm cf:preview       # Build and preview on Cloudflare
pnpm cf:deploy        # Deploy to Cloudflare Workers
pnpm cf:upload        # Build and upload assets
pnpm cf:typegen       # Generate CloudflareEnv types
```

## Architecture Overview

### App Router Structure (Next.js 16 App Router)

```
src/app/[locale]/           # Locale-based routing with next-intl
├── (landing)/              # Public marketing pages, user settings
├── (admin)/                # Admin dashboard (/admin/settings/*)
├── (auth)/                 # Auth pages (sign-in, sign-up)
├── (chat)/                 # Chat interface
├── (docs)/                 # Documentation (fumadocs)
├── (editor)/               # Meme editor interface
└── api/                    # API routes (route.ts files, not in [locale])
```

### Core Systems

**Authentication** (`src/core/auth/`)

- Uses better-auth with dynamic configuration loaded from database
- OAuth providers configured in Admin UI (`/admin/settings/auth`), not env vars
- Client: `src/core/auth/client.ts` exports `authClient` for frontend
- Server: `src/core/auth/index.ts` exports `getAuth()` async function

**Database** (`src/core/db/`)

- Drizzle ORM with multi-dialect support (PostgreSQL/MySQL/SQLite/Turso)
- `db()` function returns proxied instance with cross-dialect compatibility shims:
  - MySQL: polyfills `.returning()` and maps `onConflictDoUpdate` → `onDuplicateKeyUpdate`
  - SQLite: polyfills `.for('update')` as no-op (no row-level locking)
- Connection modes:
  - Singleton (`DB_SINGLETON_ENABLED=true`): single persistent connection
  - Serverless (`DB_SINGLETON_ENABLED=false`): new connection per query
  - Auto-detects Cloudflare Workers environment
- Schema files: `src/config/db/schema.{postgres,mysql,sqlite}.ts` (change export in `src/config/db/schema.ts` to switch)
- Migrations: stored in `src/config/db/migrations/`, table name customizable via `DB_MIGRATIONS_TABLE` env var

**RBAC** (`src/core/rbac/`)

- Custom role-based access control system
- Initialize with `pnpm rbac:init` to create default roles/permissions
- Assign roles with `pnpm rbac:assign`
- Permission checks in `src/core/rbac/permission.ts`

**Internationalization** (`src/core/i18n/`)

- next-intl for i18n with Chinese/English support
- Locale files: `src/config/locale/{en,zh}/`
- Optional locale detection: set `NEXT_PUBLIC_LOCALE_DETECT_ENABLED=true`

**Theme System** (`src/core/theme/`)

- Dynamic theming via `getThemeLayout()` and `getThemeBlock()`
- Theme implementations: `src/themes/default/`
- Configured via `NEXT_PUBLIC_THEME` env var (default: "default")
- CSS variables + Tailwind integration

### Configuration Management

**Critical Pattern**: Payment, OAuth, storage, AI, and most service settings are stored in the database (`config` table via `src/shared/models/config.ts`) and managed through Admin UI (`/admin/settings/*`), NOT environment variables.

**Environment Variables** (`.env.development`, `.env.example`):

- `DATABASE_URL`: Connection string (required)
- `DATABASE_PROVIDER`: `postgresql` | `mysql` | `sqlite` | `turso`
- `AUTH_SECRET`: 32-char secret (generate: `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL`: Application URL
- `DB_SINGLETON_ENABLED`: `true` | `false` (connection mode)

**Dynamic Configuration**: `src/shared/models/config.ts` exports `getAllConfigs()` which merges database settings with env vars. Services like payment (`src/shared/services/payment.ts`) and auth call this at runtime.

### Payment Integration

**Multi-Provider Architecture** (`src/extensions/payment/`)

- PaymentManager with pluggable providers: StripeProvider, PayPalProvider, CreemProvider
- Factory function: `getPaymentService()` in `src/shared/services/payment.ts` loads enabled providers from database config
- Checkout flow: `/api/payment/checkout` → `/api/payment/callback` → webhook at `/api/payment/notify/[provider]`
- Order lifecycle: `CREATED` → `PENDING` → `PAID` | `REFUNDED` | `CANCELLED`
- Credit allocation: `handleCheckoutSuccess()` in `src/shared/services/payment.ts` grants credits after payment

### Data Models (`src/shared/models/`)

**Credit System** (`credit.ts`):

- FIFO consumption with expiration support
- Transaction types: `GRANT` | `CONSUME`
- Scenes: `PAYMENT` | `SUBSCRIPTION` | `RENEWAL` | `GIFT` | `REWARD`
- `consumeCredits()` uses database transactions with row-level locking (`.for('update')`)
- Expiration calculated via `calculateCreditExpirationTime()` (respects subscription periods)

**Subscriptions** (`subscription.ts`):

- Statuses: `ACTIVE` | `CANCELLED` | `PAUSED` | `EXPIRED` | `PAST_DUE`
- Linked to payment provider subscription IDs
- Auto-renewal handled by webhook events

**Orders** (`order.ts`):

- Types: `ONE_TIME` | `SUBSCRIPTION`
- Payment providers: `stripe` | `paypal` | `creem`

**AI Tasks** (`ai_task.ts`):

- Tracks generation jobs (image, audio, music, video)
- Statuses: `PENDING` | `PROCESSING` | `COMPLETED` | `FAILED`

**Memes** (`meme.ts`, `meme_template.ts`, `meme_comment.ts`):

- Core meme generator models
- Templates, user-generated memes, comments with likes

### Extensions (`src/extensions/`)

Pluggable service integrations:

- **AI** (`ai/`): AI SDK providers (OpenRouter, Replicate)
- **Payment** (`payment/`): Stripe, PayPal, Creem providers
- **Storage** (`storage/`): R2, S3 storage providers
- **Email** (`email/`): Resend email service
- **Analytics** (`analytics/`): Google Analytics, Clarity, Plausible, OpenPanel, Vercel
- **Ads** (`ads/`): Google AdSense
- **Affiliate** (`affiliate/`): Affiliate tracking
- **Customer Service** (`customer-service/`): Intercom, Crisp

### Shared Code (`src/shared/`)

- **blocks/**: Reusable UI components (dashboard, forms, tables, meme editor, chat, generators)
- **components/**: Base UI components (mostly shadcn/ui based)
- **services/**: Business logic layer (payment, settings, RBAC, AI, storage, email, analytics, ads, affiliate)
- **models/**: Database query functions and types (Drizzle operations)
- **lib/**: Utilities (hashing, validation, etc.)
- **hooks/**: React hooks
- **contexts/**: React contexts
- **types/**: TypeScript type definitions

### Path Mapping

TypeScript paths (tsconfig.json):

- `@/*` → `./src/*`
- `@/.source` → `./.source/index.ts` (fumadocs)

## Development Patterns

### Dynamic Configuration Loading

When working with OAuth, payment, storage, AI settings:

1. Check `src/shared/models/config.ts` for available settings
2. Use `getAllConfigs()` to load merged env + DB settings
3. Never hardcode provider credentials; load from config service
4. Admin can change settings at runtime via `/admin/settings/*` UI

### Database Schema Changes

1. Update schema in `src/config/db/schema.{dialect}.ts`
2. Run `pnpm db:generate` to create migration
3. Review migration in `src/config/db/migrations/`
4. Run `pnpm db:migrate` to apply
5. For rapid iteration in dev: `pnpm db:push` (skips migration files)

### Multi-Dialect Compatibility

When writing queries:

- Use `db()` accessor (not direct dialect imports)
- `.returning()` works on all dialects (polyfilled for MySQL)
- Use `onConflictDoUpdate()` (auto-mapped to `onDuplicateKeyUpdate` on MySQL)
- Avoid `.for('update')` in WHERE-less queries on SQLite (polyfilled but no-op)
- Test with multiple `DATABASE_PROVIDER` values if making core DB changes

### Credit Operations

Always use transactions when consuming credits:

```typescript
await db().transaction(async (tx) => {
  await consumeCredits({ userId, credits: 10, scene: 'ai_generation', tx });
  // ... other operations
});
```

### Meme Feature Development

- Meme templates: `src/shared/models/meme_template.ts`
- Meme CRUD: `src/shared/models/meme.ts`
- Editor UI: `src/app/[locale]/(editor)/meme-editor/`
- API endpoints: `src/app/api/meme/`

## Deployment

### Vercel

- Auto-detected via `process.env.VERCEL`
- Config: `vercel.json` defines function timeouts
- Build: `pnpm build` (output: default Next.js)

### Cloudflare Workers

- Requires OpenNext build: `pnpm cf:deploy`
- Config: `wrangler.toml.example` (copy to `wrangler.toml`)
- Use Hyperdrive for database connections
- Set `DB_SINGLETON_ENABLED=false` for serverless mode

### Docker

- Multi-stage build in `Dockerfile`
- Requires `output: 'standalone'` in next.config.mjs (already configured when not on Vercel)
- Build: `docker build -t app .`
- Run: `docker run -p 3000:3000 --env-file .env app`

## Testing

No test framework is currently configured. When adding tests:

- Install testing library (e.g., Vitest, Jest)
- Add test scripts to package.json
- Update this file with test commands

## Important Notes

- **Chinese-first codebase**: The existing `docs/agents.md` contains Chinese-language AI collaboration rules. This AGENTS.md is for Warp agents; the other file is for different AI assistants.
- **Better-auth dynamic config**: Auth configuration is loaded from database at runtime via `getAuth()` async function, not static imports.
- **No public file leakage**: License warns against publicly releasing fancymeme code. Be cautious with sharing.
- **Turbopack enabled**: Dev server uses Turbopack by default (`--turbopack` flag in dev script).
- **React 19**: Uses React 19.2.1 with experimental React Compiler enabled.
- **pnpm only**: Project uses pnpm with overrides for React types. Do not use npm/yarn.
