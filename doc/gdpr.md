# GDPR / Account Rights

These endpoints allow users to exercise their data rights. Both require a valid account JWT.

---

## Export your data

**`GET /auth/export-data`**

Returns a JSON file download containing all data associated with the authenticated account.

**Headers:**
```
Authorization: Bearer <JWT>
```

**Response:** `200 OK` — triggers a file download `dwahfy-export-<username>.json`

```json
{
  "exportedAt": "2026-03-19T00:00:00.000Z",
  "account": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com"
  },
  "profile": {
    "displayName": "Alice",
    "bio": "Hello!",
    "avatarUrl": "https://...",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "posts": [...],
  "reactions": [...],
  "following": [...],
  "followers": [...],
  "badges": [...]
}
```

---

## Delete your account

**`POST /auth/delete-account`**

Permanently deletes the authenticated account. Password confirmation is required.

If this is the last account under the identity (email), the identity is deleted too.
The current JWT is revoked immediately.

**Headers:**
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Body:**
```json
{ "password": "yourpassword" }
```

**Responses:**
- `200` — `{ "message": "Account deleted" }`
- `400` — password missing
- `401` — invalid credentials or missing JWT
- `404` — account not found
- `500` — server error
