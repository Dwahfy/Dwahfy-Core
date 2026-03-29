# Admin

All admin endpoints require the `ADMIN_API_KEY` environment variable to be set.
Pass it via either header on every request:

```
X-Admin-Key: <ADMIN_API_KEY>
```
or
```
Authorization: Bearer <ADMIN_API_KEY>
```

---

## Generating an admin key

Use the included script:

```bash
bash scripts/gen-admin-key.sh
```

This generates a secure 64-character hex key, writes it to `.env` automatically, and prints it so you can copy it to your frontend `.env` as well.

---

## First admin setup

There are two ways to promote your first admin account.

### Option 1 — Bootstrap env var (recommended for new installs)

1. Register your account through the app first.
2. Add to `.env`:
   ```env
   BOOTSTRAP_ADMIN_USERNAME=yourusername
   ```
3. Restart the server. It will promote the account and log:
   ```
   Bootstrap: promoted "yourusername" to admin
   ```
4. The env var can be removed or left commented out — it is a no-op once the account is already admin.

### Option 2 — CLI script (promote any account at any time)

```bash
node scripts/make-admin.js <username>
```

With Docker:
```bash
docker compose exec app node scripts/make-admin.js <username>
```

Or directly in the database:
```bash
docker compose exec postgres psql -U postgres -d myapp_dev \
  -c "UPDATE accounts SET is_admin = TRUE WHERE username = '<username>';"
```

---

## JWT claims

When a user logs in or registers, their JWT includes an `isAdmin` boolean claim:

```json
{
  "accountId": 1,
  "identityId": 1,
  "isAdmin": true,
  "iat": 1234567890,
  "exp": 1235172690
}
```

Frontends can read this claim to gate admin UI. The actual enforcement is always done server-side via `ADMIN_API_KEY`.

---

## Endpoints

### Badges

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/badges` | List all badges |
| POST | `/admin/badges` | Create a badge |
| PATCH | `/admin/badges/:badgeId` | Update a badge |
| DELETE | `/admin/badges/:badgeId` | Delete a badge |

**Create / Update badge body:**
```json
{
  "slug": "founder",
  "name": "Founder",
  "imageUrl": "https://example.com/badges/founder.png"
}
```

---

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:accountId/admin` | Toggle admin status |
| DELETE | `/admin/users/:accountId` | Delete account |

**GET `/admin/users` query params:**
- `limit` — max results (default 50, max 100)
- `offset` — pagination offset (default 0)
- `search` — filter by username (case-insensitive)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "yadi",
      "email": "yadi@example.com",
      "is_admin": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 42
}
```

---

### Posts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/posts` | List all posts |
| DELETE | `/admin/posts/:postId` | Delete a post |
| GET | `/admin/posts/stats` | Dashboard stats |

**GET `/admin/posts` query params:**
- `limit` — max results (default 50, max 100)
- `offset` — pagination offset (default 0)

**GET `/admin/posts/stats` response:**
```json
{
  "userCount": 120,
  "postCount": 843,
  "recentUsers": [...],
  "recentPosts": [...]
}
```

---

## curl examples

### List users
```bash
curl "http://localhost:3000/admin/users" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Search users
```bash
curl "http://localhost:3000/admin/users?search=yadi" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Toggle admin
```bash
curl -X PATCH "http://localhost:3000/admin/users/1/admin" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Delete account
```bash
curl -X DELETE "http://localhost:3000/admin/users/1" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### List all posts
```bash
curl "http://localhost:3000/admin/posts" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Delete a post
```bash
curl -X DELETE "http://localhost:3000/admin/posts/5" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Dashboard stats
```bash
curl "http://localhost:3000/admin/posts/stats" \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```
