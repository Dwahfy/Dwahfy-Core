# Dwahfy Core

Backend API for Dwahfy. This repo is intentionally separate from the frontend for clean organization and independent deployments.

## Requirements

- Node.js 20+
- Docker (for Postgres, optional)

## Quick start (local + Docker databases)

1) Copy env template:

```bash
cp ex.env .env
```

2) Start databases:

```bash
docker compose up -d postgres
```

3) Run the server:

```bash
node src/server.js
```

API will be available at `http://localhost:3000`.

## Quick start (full Docker)

Build and run everything:

```bash
docker compose up --build
```

API will be available at `http://localhost:3000`.

## Environment variables

These are in `ex.env`:

- `PORT` (default: 3000)
- `DATABASE_URL` (Postgres connection string for local dev)
- `DATABASE_URL` can include `?sslmode=require` for Supabase
- `JWT_SECRET` (used to sign auth tokens)
- `OTP_SECRET` (used to hash OTPs)
- `SMTP_*` (optional SMTP config for OTP emails)
- `CORS_ORIGIN` (frontend URL, for example `http://localhost:3000`)
- `BAD_WORDS_ENABLED` (set to `false` to disable bad-word filtering)

When running with Docker Compose, the app uses internal service names for DBs. If you run the server directly on your host, keep using `localhost` in the env file.

## Endpoints

- `GET /` basic health response
- `GET /health` returns `{"status":"ok"}`
- `POST /auth/start` begin signup with email-only (sends OTP)
- `POST /auth/verify-otp` verify OTP and get register token
- `POST /auth/register` complete signup with username + password
- `POST /auth/login` login with username + password
- `POST /auth/accounts` list accounts for an identity token
- `POST /auth/switch` switch accounts using an identity token
- `POST /auth/logout` revoke the current JWT (in-memory)
- `POST /auth/change-password` change password for the current account
- `POST /auth/request-email-change` send OTP to a new email address
- `POST /auth/confirm-email-change` confirm email change with OTP
- `POST /posts` create a text post
- `GET /posts` list recent posts
- `POST /posts/:postId/replies` reply to a post
- `GET /posts/:postId/replies` list replies
- `POST /posts/:postId/react` like or dislike a post
- `GET /profile` get current profile
- `PATCH /profile` update current profile
- `GET /profile/:username` public profile by username
- `GET /badges` list available badges
- `GET /admin/badges` list badges (admin)
- `POST /admin/badges` create badge (admin)
- `PATCH /admin/badges/:badgeId` update badge (admin)
- `DELETE /admin/badges/:badgeId` delete badge (admin)

## Admin access

Set `ADMIN_API_KEY` and send it via `X-Admin-Key` or `Authorization: Bearer <key>` for `/admin/*` routes.

## Generate a JWT (dev)

Use the same secret as your server (`JWT_SECRET` in `.env`):

```bash
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({id:1}, 'your-secret-here', {expiresIn:'7d'}))"
```

## Project structure

- `src/server.js` main entry point
- `src/config/` database and app configuration
- `src/controllers/` request handlers
- `src/models/` data access helpers
- `src/routes/` route definitions
- `src/services/` external service helpers
- `src/utils/` utilities

## Roadmap

See `doc/roadmap.md`.

## Contributing

1) Fork the repo and create your branch: `git checkout -b feature/my-change`
2) Make changes with clear commits
3) Ensure the server boots and endpoints respond
4) Open a PR describing the change and why it is needed

### Style and conventions

- Keep changes focused and small
- Prefer explicit names and simple control flow
- Add or update docs when behavior changes

## Notes for frontend integration

If the frontend runs on your host machine (separate repo), point it at `http://localhost:3000`. If you later containerize the frontend, use the backend service name `app:3000` inside Docker.
