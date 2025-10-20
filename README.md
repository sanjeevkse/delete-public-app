# feed-backend

Node.js + Express backend bootstrapped with TypeScript, Sequelize, and an event-driven layer.

## Prerequisites

- Node.js 18+
- MySQL 8.0+ (or compatible)

## Setup

1. Copy `.env.example` to `.env` and adjust the database credentials (MySQL), JWT secret/expiry, and server ports.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Run the development server:

   ```sh
   npm run dev
   ```

   The API listens on `PORT` (defaults to `8081`). Lens.js traffic tracking listens on `LENS_PORT` (defaults to `8082`).

4. Run database migrations (MySQL must be reachable):

   ```sh
   npm run migrate
   # or
   yarn migrate
   ```

5. Seed reference data (baseline roles):

   ```sh
   npm run seed
   # or
   yarn seed
   ```

6. For production builds:

   ```sh
   npm run build
   npm start
   ```

## Project structure

- `src/config` — environment and Sequelize configuration
- `src/models` — Sequelize models mapped to the provided SQL schema
- `src/controllers` — MVC controllers implementing CRUD endpoints
- `src/routes` — Express routers composed under `/api`
- `src/middlewares` — reusable middleware (rate limiting, Lens.js bridge, error handler)
- `src/events` — application event bus and subscribers persisting audit logs

## Available routes

- `GET /api/health`
- `Auth` — login (`POST /api/auth/login`) and self-registration (`POST /api/auth/register`)
- `Users` — registration plus CRUD & role assignment (`/api/users`)
- `Posts` — CRUD and reactions (`/api/posts`)
- `Events` — CRUD and registrations (`/api/events`)
- `Roles` — CRUD and permissions listing (`/api/roles`)

> Protected endpoints expect a `Bearer <token>` Authorization header containing the JWT returned by `/api/auth/login`.

> Each controller uses the central event bus to emit actions, which in turn log audit entries asynchronously.

## Sequelize models

All tables defined under `sql/` have associated models with relationships defined in `src/models/index.ts`. Update the `.env` file with your actual database values before running migrations or syncing.

## Lens.js integration

`src/middlewares/lensTracker.ts` dynamically registers Lens.js with Express and starts the tracker on `LENS_PORT`. If Lens.js fails to initialize, the application continues to run and logs a warning.

## Authentication flow

1. Register a user via `POST /api/auth/register` (or `/api/users`) with `contactNumber` and optional profile fields.
2. Request a login OTP using `POST /api/auth/request-otp` with either `contactNumber` or `email`.
3. Verify the OTP using `POST /api/auth/login`. The master OTP defined by `MASTER_OTP` in `.env` is always accepted for administrative access.
4. Include the returned JWT in subsequent requests as `Authorization: Bearer <token>` to access protected resources (users, posts, events, roles mutations).
