## Roadmap

This is a lightweight status list to track what is complete and what is next.

### Completed

- Email OTP signup with rate limiting
- Multi-account per email identity
- Username/password login
- Fast account switching with identity token
- Logout (in-memory revocation)
- Password change per account
- Email change with OTP verification
- Password reset flow (forgot password)

### Completed (continued)

- Text-only posts
- Post replies (single-level)
- Likes and dislikes
- Badge system (public listing + admin CRUD)
- Avatar and profile image uploads
- Admin user management (list, toggle admin, delete)
- Admin post moderation (list all, delete)
- Admin dashboard stats
- Bootstrap admin via env var (`BOOTSTRAP_ADMIN_USERNAME`)
- Admin key generation script (`scripts/gen-admin-key.sh`)
- `isAdmin` claim in JWT

### Planned

- Durable logout (DB-backed token revocation)
- Remember-device / trusted device tokens
- Account deletion and data export
- Dwahfy ID service (OAuth/OIDC) for ecosystem apps
