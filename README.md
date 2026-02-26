# 📦 Stock Management Platform

A full-stack inventory management system for tracking products, warehouses, and stock movements.

> **Live URL**: _Not deployed yet — run locally with Docker (see below)._

> **Taskboard**: https://www.notion.so/311ba677b46c80bcb3a8dff619f9f411?v=311ba677b46c81838dde000c5c31a59a&source=copy_link

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Docker)](#getting-started-docker)
- [Testing](#testing)
- [Seed User Credentials](#seed-user-credentials)
- [API Documentation](#api-documentation)
- [Rate Limiting & Session Notes](#rate-limiting--session-notes)
- [Features](#features)
- [Environment Variables](#environment-variables)
- [Decisions and Trade-offs](#decisions-and-trade-offs)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │   Frontend   │   │   Backend    │   │  PostgreSQL  │  │
│  │ (React/Vite) │──▶│   (NestJS/   │──▶│  15-alpine   │  │
│  │    :5173     │   │   Fastify)   │   │    :5433     │  │
│  │              │   │    :3000     │   │              │  │
│  └──────────────┘   └──────────────┘   └──────────────┘  │
│       SPA               REST API          Data Store     │
└──────────────────────────────────────────────────────────┘
```

### Backend (NestJS + Fastify)

```
AppModule
├── AuthModule          — JWT + GitHub OAuth2, login/register
│   ├── JwtStrategy     — Extracts token from Bearer header or auth_token cookie
│   ├── JwtAuthGuard    — Protects authenticated routes
│   └── RolesGuard      — Enforces RBAC (ADMIN, MANAGER, VIEWER)
├── UsersModule         — User listing (Admin), role management (Admin)
├── ProductsModule      — CRUD for products (SKU, name, price)
├── WarehousesModule    — CRUD for warehouses (name, location)
├── MovementsModule     — Stock IN / OUT / TRANSFER with atomic consistency
├── ReportsModule       — Stock-on-hand & movement summary reporting
├── PrismaModule        — Database ORM (global, singleton)
├── AuditModule         — Centralized audit trail endpoints & service
└── ThrottlerModule     — Global + endpoint-specific rate limiting
```

### Frontend (React + Vite + TailwindCSS)

```
App
├── /login              — Email/password login + GitHub OAuth button
├── /register           — User registration
├── /auth/callback      — GitHub OAuth callback handler
├── / (Dashboard)       — Overview with stock stats and charts
├── /products           — Product CRUD (Admin/Manager: create/edit/delete)
├── /warehouses         — Warehouse CRUD (Admin/Manager: create/edit/delete)
├── /movements          — Stock movement log + create (Admin/Manager only)
└── /users              — User management + role assignment (Admin only)
```

### Database (PostgreSQL + Prisma)

```
┌─────────────┐    ┌───────────────┐    ┌───────────────┐
│    User     │───▶│ StockMovement │◀───│    Product    │
│             │    │               │    │               │
│ id          │    │ id            │    │ id            │
│ email       │    │ type          │    │ sku (unique)  │
│ name?       │    │ quantity      │    │ name          │
│ password?   │    │ date          │    │ description?  │
│ provider    │    │ productId     │    │ price         │
│ role        │    │ from/to IDs   │    └───────┬───────┘
└─────────────┘    │ createdBy     │            │
                   └───────┬───────┘    ┌───────▼───────┐
                           │            │     Stock     │
                   ┌───────▼───────┐    │               │
                   │   Warehouse   │◀───│ id            │
                   │               │    │ quantity      │
                   │ id            │    │ productId     │
                   │ name          │    │ warehouseId   │
                   │ location?     │    │ (unique pair) │
                   └───────────────┘    └───────────────┘
```

**Key constraints:**

- `Stock` has a **unique compound index** on `(productId, warehouseId)` — one stock record per product per warehouse.
- `StockMovement.createdById` uses `ON DELETE SET NULL` — movements survive user deletion.
- Passwords are **nullable** to support OAuth-only users (provider = `"github"`).

---

## Tech Stack

| Layer        | Technology                                                           |
| ------------ | -------------------------------------------------------------------- |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4, Zustand, React Query, Zod |
| **Backend**  | Node.js 22, NestJS 11, Fastify, Passport (JWT), Prisma 5             |
| **Database** | PostgreSQL 15                                                        |
| **Auth**     | JWT (Bearer + HTTP-only cookie), GitHub OAuth2                       |
| **Logging**  | Pino (structured JSON, pretty-print in dev)                          |
| **Infra**    | Docker & Docker Compose                                              |
| **i18n**     | i18next (EN/HU/RO)                                                   |

---

## Project Structure

```
Stock-management-platform/
├── docker-compose.yml          # Orchestrates all 3 services
├── .env                        # Environment variables (gitignored)
├── .env.example                # Template for .env
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.ts             # Seed data (users, products, warehouses)
│   │   └── migrations/         # SQL migrations
│   ├── tests/
│   │   ├── unit/               # Jest unit tests
│   │   └── e2e/                # Jest e2e tests
│   └── src/
│       ├── main.ts             # Fastify bootstrap, cookie plugin, Swagger
│       ├── app.module.ts       # Root module
│       ├── auth/               # Authentication & authorization
│       ├── audit/              # Audit log controller/service
│       ├── users/              # User management (Admin)
│       ├── products/           # Product CRUD
│       ├── warehouses/         # Warehouse CRUD
│       ├── movements/          # Stock movements (IN/OUT/TRANSFER)
│       ├── reports/            # Reporting endpoints
│       ├── prisma/             # Prisma service (global)
│       └── common/             # Shared filters, pipes, etc.
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── e2e/                    # Playwright e2e tests
    ├── playwright.config.ts    # Playwright configuration
    └── src/
        ├── App.tsx             # Root component with routing
        ├── pages/              # Page components
        ├── components/         # Reusable UI components
        ├── store/              # Zustand auth store
        ├── services/           # Axios API client
        ├── locales/            # i18n translations
        └── utils/              # Shared utilities
```

---

## Getting Started (Docker)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

### 1. Clone the repository

```bash
git clone https://github.com/Armandd1/Stock-management-platform.git
cd Stock-management-platform
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` if you want to customize passwords, JWT secret, or add GitHub OAuth credentials.

### 3. Start the application

```bash
docker compose up --build
```

This will:

1. Start **PostgreSQL** (host port `5433`, container port `5432`) with a health check
2. Build and start the **Backend** (port `3000`), running Prisma migrations and seeding the database automatically
3. Build and start the **Frontend** (port `5173`)

### 4. Access the application

| Service          | URL                                      |
| ---------------- | ---------------------------------------- |
| **Frontend**     | http://localhost:5173                    |
| **Backend API**  | http://localhost:3000/api/v1             |
| **Swagger Docs** | http://localhost:3000/api/docs           |
| **GitHub OAuth** | http://localhost:3000/api/v1/auth/github |

### 5. Stop the application

```bash
docker compose down        # Keep data
docker compose down -v     # Remove data (drops database volume)
```

### 6. Code Quality (Lint & Format)

The project includes unified strict ESLint and Prettier configurations for both the frontend and backend. You can run checks or auto-format code from the **root directory**:

```bash
# Format all code (Prettier)
npm run format

# Run linter and auto-fix issues (ESLint)
npm run lint
```

---

## Testing

Run all test commands from the **root directory**:

Before running any **e2e** test command, start Docker services manually:

```bash
docker compose up --build
```

```bash
# Backend unit tests (Jest)
npm run test:unit:backend

# Backend end-to-end tests (Jest e2e)
npm run test:e2e:backend

# Frontend end-to-end tests (Playwright)
npm run test:e2e

# Full test suite: backend unit + backend e2e + frontend e2e
npm run test:all
```

Notes:

- E2E test scripts do **not** start Docker automatically.
- Ensure required services are already running before `npm run test:e2e:backend`, `npm run test:e2e`, or `npm run test:all`.
- Backend unit tests execute the `backend/tests/unit` suite.
- `npm run test:e2e:backend` executes the `backend/tests/e2e` suite.
- `npm run test:all` chains backend unit + backend e2e + frontend e2e; Docker must already be running for e2e steps.
- Latest backend coverage summary is tracked in `backend/test-coverage.md`.

---

## Seed User Credentials

The database is seeded automatically on first start with three users:

| Role      | Email                 | Password      | Permissions                                   |
| --------- | --------------------- | ------------- | --------------------------------------------- |
| **ADMIN** | `admin@example.com`   | `Admin123!`   | Full access: CRUD all resources, manage users |
| MANAGER   | `manager@example.com` | `Manager123!` | Create/edit products, warehouses, movements   |
| VIEWER    | `viewer@example.com`  | `Viewer123!`  | Read-only access to all resources             |

> Passwords can be customized via `ADMIN_PASSWORD`, `MANAGER_PASSWORD`, and `VIEWER_PASSWORD` in `.env`.

### GitHub OAuth Login

New users logging in via GitHub are automatically assigned the **VIEWER** role. An Admin can later promote them via the `/users` page.

To enable GitHub login:

1. Go to [GitHub Developer Settings → OAuth Apps → New OAuth App](https://github.com/settings/developers)
2. Set **Homepage URL**: `http://localhost:5173`
3. Set **Authorization callback URL**: `http://localhost:3000/api/v1/auth/github/callback`
4. Copy the Client ID and Secret into your `.env`

---

## API Documentation

Interactive API documentation is available via Swagger at:

**http://localhost:3000/api/docs**

### Key Endpoints

| Method  | Endpoint                           | Auth      | Description                   |
| ------- | ---------------------------------- | --------- | ----------------------------- |
| `POST`  | `/api/v1/auth/login`               | —         | Login with email/password     |
| `POST`  | `/api/v1/auth/register`            | —         | Register a new user           |
| `GET`   | `/api/v1/auth/me`                  | Bearer    | Get current user profile      |
| `GET`   | `/api/v1/auth/github`              | —         | Initiate GitHub OAuth2        |
| `GET`   | `/api/v1/products`                 | Bearer    | List products                 |
| `POST`  | `/api/v1/products`                 | Admin/Mgr | Create a product              |
| `GET`   | `/api/v1/warehouses`               | Bearer    | List warehouses               |
| `POST`  | `/api/v1/warehouses`               | Admin/Mgr | Create a warehouse            |
| `GET`   | `/api/v1/movements`                | Admin/Mgr | List stock movements          |
| `POST`  | `/api/v1/movements`                | Admin/Mgr | Create IN/OUT/TRANSFER        |
| `GET`   | `/api/v1/reports/stock-on-hand`    | Bearer    | Stock levels per warehouse    |
| `GET`   | `/api/v1/reports/movement-summary` | Bearer    | Movement summary with filters |
| `GET`   | `/api/v1/users`                    | Admin     | List all users                |
| `PATCH` | `/api/v1/users/:id/role`           | Admin     | Update a user's role          |
| `GET`   | `/api/v1/audit-logs`               | Admin     | View system audit trail       |
| `GET`   | `/api/v1/movements/sse`            | Bearer    | Real-time update stream (SSE) |

---

## Rate Limiting & Session Notes

- **Global API throttling**: `200 requests / minute` per client (Throttler global guard).
- **Login endpoint throttling**: `POST /api/v1/auth/login` is stricter at `20 requests / minute`.
- **Auth cookie**: `auth_token` is set as HTTP-only cookie with ~24h max age.
- **OAuth state cookie**: `github_oauth_state` has a 10-minute lifetime for callback validation.

---

## Features

### Core

- ✅ **Product Management** — CRUD with SKU, name, description, price
- ✅ **Warehouse Management** — CRUD with name and location
- ✅ **Stock Movements** — IN (receive), OUT (ship), TRANSFER (between warehouses)
- ✅ **Stock Consistency** — Atomic updates, prevents negative stock levels
- ✅ **Reporting** — Stock-on-hand per warehouse, movement summary
- ✅ **CSV Import** — Bulk import products via CSV
- ✅ **QR/Barcode Integration** — Generate and view QR codes for items directly
- ✅ **Optimistic UI** — Instant feedback for stock movements
- ✅ **Live Updates** — Server-Sent Events (SSE) for real-time frontend syncing
- ✅ **Audit Logging** — Track system activity across the platform

### Authentication & Authorization

- ✅ **JWT Authentication** — Token via Bearer header or HTTP-only cookie
- ✅ **GitHub OAuth2** — One-click login, auto-creates VIEWER accounts
- ✅ **Policy-based RBAC** — CASL-based Guards for fine-grained resource permission policies
- ✅ **Provider Conflict Detection** — Prevents GitHub login for email/password accounts

### Frontend

- ✅ **Responsive SPA** — Dark/light theme, TailwindCSS, Lucide icons
- ✅ **Internationalization** — English, Hungarian, and Romanian (i18next)
- ✅ **Form Validation** — React Hook Form + Zod schemas
- ✅ **Toast Notifications** — Success/error feedback
- ✅ **Client-side Route Guards** — AuthGuard + RoleGuard

### Infrastructure

- ✅ **Fully Dockerized** — Single `docker compose up` to start
- ✅ **Auto Migration & Seed** — Database setup on container start
- ✅ **Structured Logging** — Pino with request IDs
- ✅ **Rate Limiting** — Global 200 req/min; stricter login limit 20 req/min
- ✅ **Swagger/OpenAPI** — Interactive API documentation

---

## Environment Variables

| Variable               | Default                                             | Description                     |
| ---------------------- | --------------------------------------------------- | ------------------------------- |
| `PORT`                 | `3000`                                              | Backend port                    |
| `JWT_SECRET`           | **required in production**                          | Secret for JWT signing          |
| `DATABASE_URL`         | `postgresql://admin:secret@...`                     | Prisma DB connection string     |
| `POSTGRES_USER`        | `admin`                                             | PostgreSQL username             |
| `POSTGRES_PASSWORD`    | `secret`                                            | PostgreSQL password             |
| `POSTGRES_DB`          | `stockmanager`                                      | PostgreSQL database name        |
| `ADMIN_PASSWORD`       | `Admin123!`                                         | Seed admin password             |
| `MANAGER_PASSWORD`     | `Manager123!`                                       | Seed manager password           |
| `VIEWER_PASSWORD`      | `Viewer123!`                                        | Seed viewer password            |
| `GITHUB_CLIENT_ID`     | _(empty)_                                           | GitHub OAuth App Client ID      |
| `GITHUB_CLIENT_SECRET` | _(empty)_                                           | GitHub OAuth App Client Secret  |
| `GITHUB_CALLBACK_URL`  | `http://localhost:3000/api/v1/auth/github/callback` | OAuth callback URL              |
| `FRONTEND_URL`         | `http://localhost:5173`                             | Frontend base URL for redirects |
| `VITE_API_URL`         | `http://localhost:3000/api/v1`                      | API base URL for the frontend   |

---

## Decisions and Trade-offs

### 1. Fastify over Express

**Decision**: NestJS with Fastify adapter instead of the default Express.
**Why**: Fastify offers 2–3× better throughput and lower latency. Its schema-based validation and plugin system are a natural fit for a structured NestJS application.
**Trade-off**: Some Passport strategies (like `passport-github2`) don't work with Fastify out of the box. Solved this by implementing a manual OAuth2 flow using `fetch()` for the GitHub token exchange, which is simpler and has zero middleware dependencies.

### 2. Manual GitHub OAuth2 (no Passport strategy)

**Decision**: Instead of `passport-github2`, manually redirect to GitHub, exchange the authorization code via `fetch()`, and call the GitHub API directly.
**Why**: Passport OAuth2 strategies rely on Express-style middleware (`req.session`, `res.redirect`) which breaks on Fastify. The manual flow is ~40 lines of code and fully transparent.
**Trade-off**: No session support for OAuth state parameter (CSRF mitigation). For production, a `state` parameter with a server-side nonce should be added.

### 3. JWT in HTTP-only cookie (for OAuth) + Bearer header (for API)

**Decision**: Dual token extraction — the JWT strategy reads from `Authorization: Bearer <token>` first, then falls back to the `auth_token` HTTP-only cookie.
**Why**: After GitHub OAuth callback, we can't send a Bearer token to the frontend SPA via a redirect. Using an HTTP-only cookie prevents token leakage in browser history, logs, and referrer headers. Regular API clients (Swagger, mobile) still use the standard Bearer header.
**Trade-off**: Cross-origin cookie handling requires matching `sameSite` and `secure` settings in production. CORS must be configured to allow credentials.

### 4. Single Prisma migration file

**Decision**: All schema changes (initial + auth fields) are consolidated into a single migration.
**Why**: During early development, iterating on a single migration avoids a chain of incremental migrations that are hard to review. Once the schema stabilizes, new changes get their own migrations.
**Trade-off**: You must `docker compose down -v` to reset the database when the migration changes (cannot apply partial changes).

### 5. Nullable password + provider field

**Decision**: `password` is nullable and `provider` defaults to `"local"` on the User model.
**Why**: GitHub users don't have local passwords. Making `password` nullable avoids sentinel values ("no-password") and keeps the schema honest. The `provider` field enables conflict detection (prevents GitHub login for local accounts and vice versa).
**Trade-off**: All password-related code must handle `null` checks.

### 6. Role-based seeding with environment variables

**Decision**: Seed passwords are configurable via `ADMIN_PASSWORD`, `MANAGER_PASSWORD`, `VIEWER_PASSWORD` env vars.
**Why**: Default passwords make local development frictionless, while production deployments can override them without modifying code.
**Trade-off**: If someone forgets to change defaults in production, the system ships with known credentials. The `JWT_SECRET` validation (throws in production if unset) partially mitigates this pattern.

### 8. Policy-based RBAC (CASL)

**Decision**: Replaced simple role-string checks with a policy-based approach using **CASL** for both backend guards and frontend UI visibility.
**Why**: It decouples permission logic from controllers. Instead of checking if a user is an "ADMIN", we check if they "can create products". This allows for easier adjustments to permissions and supports complex rules (e.g., users can only edit their own profile) without touching business logic.
**Trade-off**: Requires more boilerplate (Ability factory, policy decorators) compared to primitive role checks, but significantly improves maintainability.

### 9. SSE for Real-time Updates

**Decision**: Used **Server-Sent Events (SSE)** instead of WebSockets for live stock and movement notifications.
**Why**: SSE is simpler to implement (native browser support, standard HTTP), handles automatic reconnection, and is perfectly suited for server-to-client notifications. It is more resource-efficient than WebSockets for high-read, low-bidirectional-traffic scenarios.
**Trade-off**: SSE only supports unidirectional communication. If real-time bidirectional interaction (like a chat) were required, WebSockets would be necessary.

### 10. Optimistic UI for Movements

**Decision**: Implemented **Optimistic Updates** in the Movements interface using TanStack Query.
**Why**: Database transactions for stock movements involving multiple warehouses can take ~1s. Updating the local UI state immediately before the server response makes the application feel "snappy" and high-performance.
**Trade-off**: Increases frontend complexity, requiring robust error handling to rollback the UI if the server request fails.

### 11. Explicit Audit Logging

**Decision**: Implemented an explicit `AuditService` called directly from business logic services, rather than using a global interceptor.
**Why**: Global interceptors are "blind"—they only see request metadata. Explicit logging allows capturing granular details like "before and after" states, specific entity IDs, and precise field changes (e.g., `oldRole` vs `newRole`) which are essential for security.
**Trade-off**: Developers must manually ensure the `AuditService` is correctly called in every mutating method.

### 12. Local JSON-based i18n

**Decision**: Used **i18next** with local JSON files and browser language detection, supporting English, Hungarian, and Romanian.
**Why**: Local files provide the fastest load times and zero-dependency rendering. `react-i18next` handles pluralization and complex interpolation seamlessly.
**Trade-off**: As the application grows, translation files can become large. This can be mitigated later with lazy-loading specific namespaces.

---

## License

This project is unlicensed (private/educational use).
