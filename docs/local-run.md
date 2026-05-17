# Local Run Notes

Docker is intentionally left for the end of the project. For now, run the services locally.

## 1. Environment files

Copy each `.env.example` file to `.env` in the same folder:

- `client/.env.example`
- `infrastructure/gateway-api/.env.example`
- `infrastructure/microservices/auth-microservice/.env.example`
- `infrastructure/microservices/user-microservice/.env.example`
- `infrastructure/microservices/ad-microservice/.env.example`
- `infrastructure/microservices/transaction-microservice/.env.example`
- `infrastructure/microservices/chat-microservice/.env.example`
- `infrastructure/microservices/audit-microservice/.env.example`

The default local ports are:

- Gateway: `5000`
- Auth service: `5001`
- User service: `5002`
- Ad service: `5003`
- Transaction service: `5004`
- Chat service: `5005`
- Audit service: `5006`
- Client dev server: `5173`

## 2. Database preparation

Create PostgreSQL databases matching the local env examples:

- `auth_db`
- `user_db`
- `ad_db`
- `transaction_db`
- `chat_db`
- `audit_db`

Then run this inside each microservice folder:

```bash
npm run prisma:generate
npm run prisma:push
```

## 3. Start order

Start the backend services first:

```bash
npm run dev
```

Recommended order:

1. `user-microservice`
2. `auth-microservice`
3. `ad-microservice`
4. `transaction-microservice`
5. `chat-microservice`
6. `audit-microservice`
7. `gateway-api`
8. `client`

## 4. Verification commands

Backend:

```bash
npm run typecheck
```

Client:

```bash
npm run build
```

Electron packaging is a separate step now:

```bash
npm run package
```

## 5. Create local admin

Start `user-microservice` first, then run this inside `auth-microservice`:

```bash
npm run seed:admin
```

Default credentials come from `auth-microservice/.env`:

- username: `admin`
- password: `Admin123!`
