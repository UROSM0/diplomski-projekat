# Implementation Blueprint

## Goal

Build a web application for online trading based on a microservice architecture, following the provided specification and the structural style of the reference project, but using:

- PostgreSQL
- Prisma ORM
- Express + TypeScript
- Gateway as the only public backend entry point

## Guiding Principles

- Keep the folder and layer organization close to the reference project.
- Do not copy old ORM/database decisions from the reference project.
- Avoid carrying over old lockfiles, stale package metadata, or outdated output paths.
- Build the system in vertical slices so each phase leaves the project in a runnable state.

## Target Repository Shape

```text
client/
docs/
infrastructure/
  docker-compose.yml
  gateway-api/
  microservices/
    auth-microservice/
    user-microservice/
    ad-microservice/
    transaction-microservice/
    chat-microservice/
    audit-microservice/
```

## Backend Style

Each backend service should keep a structure similar to:

```text
src/
  Domain/
    DTOs/
    enums/
    services/
    types/
  Integrations/
    clients/
    DTOs/
  Middlewares/
  Prisma/
    client.ts
  Services/
  WebAPI/
    controllers/
    validators/
  app.ts
  index.ts
prisma/
  schema.prisma
```

Notes:

- `Domain` keeps contracts, DTOs, enums, and shared service interfaces.
- `Services` keeps business logic.
- `WebAPI/controllers` exposes HTTP endpoints.
- `WebAPI/validators` keeps request validation helpers.
- `Integrations` is used for internal HTTP calls to other services.
- `prisma/schema.prisma` defines the service database schema.
- `src/Prisma/client.ts` exports the Prisma client singleton for that service.

## Microservices and Responsibilities

### Gateway API

- Public entry point for the client
- Request routing to internal services
- Access token verification on protected routes
- Role-based access checks
- No business logic

### Auth Microservice

- Register user
- Login user
- Refresh access token
- Logout user
- Hash passwords with bcrypt
- Persist refresh tokens for invalidation
- Emit audit events

Primary data:

- User credentials snapshot needed for authentication
- Refresh tokens

### User Microservice

- Profile read/update
- Change password flow coordination
- User administration
- Role and status management
- Wallet balance and top-up
- Favorites
- Notifications read/update

Primary data:

- User profile
- Wallet/balance
- Favorites
- Notifications

### Ad Microservice

- Categories
- Ads CRUD
- Ad images via Multer
- Moderation workflow
- Public listing, search, filtering, pagination
- My ads listing

Primary data:

- Category
- Ad
- AdImage
- ModerationRequest

### Transaction Microservice

- Purchase workflow
- Balance transfer orchestration
- Transaction history
- Ratings after completed transaction

Primary data:

- Transaction
- Rating

### Chat Microservice

- Conversations
- Messages
- Read/unread state
- Polling-friendly retrieval

Primary data:

- Conversation
- Message

### Audit Microservice

- Store audit records
- Admin listing and filtering

Primary data:

- AuditLog

## Database Strategy

- One PostgreSQL database per microservice
- One Prisma schema per microservice
- UUID identifiers across business entities unless a narrow technical exception appears
- No direct database sharing between services
- Communication between services is REST over internal HTTP only

## Initial Database Ownership

### auth_db

- `users_auth`
- `refresh_tokens`

### user_db

- `users`
- `favorites`
- `notifications`

### ad_db

- `categories`
- `ads`
- `ad_images`
- `moderation_requests`

### transaction_db

- `transactions`
- `ratings`

### chat_db

- `conversations`
- `messages`

### audit_db

- `audit_logs`

## Shared Cross-Service Rules

- Access token short lifetime, recommended 15 minutes
- Refresh token longer lifetime, recommended 7 days
- All list endpoints support `page` and `limit`
- All list responses return pagination metadata
- Gateway is the only service exposed to the client
- Internal services communicate over private Docker network
- Important actions emit audit log events

## Environment Variables by Service

### Gateway

- `PORT`
- `JWT_ACCESS_SECRET`
- `AUTH_SERVICE_URL`
- `USER_SERVICE_URL`
- `AD_SERVICE_URL`
- `TRANSACTION_SERVICE_URL`
- `CHAT_SERVICE_URL`
- `AUDIT_SERVICE_URL`
- `CLIENT_ORIGIN`

### Auth

- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `AUDIT_SERVICE_URL`

### User

- `PORT`
- `DATABASE_URL`
- `AUDIT_SERVICE_URL`

### Ad

- `PORT`
- `DATABASE_URL`
- `AUDIT_SERVICE_URL`
- `USER_SERVICE_URL`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE_MB`

### Transaction

- `PORT`
- `DATABASE_URL`
- `USER_SERVICE_URL`
- `AD_SERVICE_URL`
- `AUDIT_SERVICE_URL`

### Chat

- `PORT`
- `DATABASE_URL`
- `AUDIT_SERVICE_URL`

### Audit

- `PORT`
- `DATABASE_URL`

## Implementation Phases

### Phase 1

- Finalize architecture and conventions
- Prepare Docker and PostgreSQL layout
- Prepare Prisma foundations for existing services

### Phase 2

- Gateway API
- Auth microservice
- User microservice

Deliverable:

- Register/login/refresh/logout
- Protected routes
- User profile
- Admin user listing and management
- Wallet top-up

### Phase 3

- Ad microservice

Deliverable:

- Categories
- Ad CRUD
- Image upload
- Moderation
- Public search/filter/listing

### Phase 4

- Transaction microservice

Deliverable:

- Purchase flow
- Sold status update
- Rating flow

### Phase 5

- Chat microservice
- Audit microservice

Deliverable:

- Conversations and messages
- Audit event storage and admin view

### Phase 6

- Notifications and favorites completion
- Frontend integration
- End-to-end hardening

## What We Reuse From the Reference Project

- Layered organization
- DTO and interface-driven structure
- Separate gateway and service folders
- Service/controller split
- Similar naming conventions where they fit the new domain

## What We Intentionally Do Differently

- Prisma instead of TypeORM
- PostgreSQL instead of MySQL
- Fresh package metadata and lockfiles
- Explicit `rootDir` and `dist` layout rules
- Refresh token support from the start
- Stronger pagination and role rules directly from the specification

## Immediate Next Step

Prepare infrastructure for the first runnable foundation:

- `docker-compose.yml`
- PostgreSQL services/databases
- `.env.example` files
- Prisma initialization for `auth-microservice` and `user-microservice`
- removal/replacement plan for old database layer files
