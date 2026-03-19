# 2FA TOTP Design

## Overview

Add opt-in TOTP-based two-factor authentication to Dwahfy-Core using the `otpauth` package. Users can enable 2FA per account (per username, not per identity/email). Recovery is available via both backup codes and email OTP fallback.

## Database Schema

### Additions to `accounts` table (migrations in `src/config/db.js`)

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

### New `totp_backup_codes` table

```sql
CREATE TABLE IF NOT EXISTS totp_backup_codes (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ
);
```

Backup codes are bcrypt-hashed before storage. 8 codes generated at setup confirmation. Old codes are deleted and replaced if the user disables then re-enables 2FA.

## Endpoints

All mounted under `/auth` via the new `twoFactor` router.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/2fa/setup` | Account JWT | Generate TOTP secret, return `otpauth://` URI for QR display |
| `POST` | `/auth/2fa/confirm` | Account JWT | Verify first TOTP code, activate 2FA, return 8 plaintext backup codes (shown once) |
| `DELETE` | `/auth/2fa/disable` | Account JWT | Disable 2FA — requires `password` + `totpCode` in body |
| `POST` | `/auth/2fa/verify` | Pending token | Submit TOTP code to complete login |
| `POST` | `/auth/2fa/recover/email` | Pending token | Send email OTP to registered email to bypass 2FA |
| `POST` | `/auth/2fa/recover/backup` | Pending token | Use one of the 8 backup codes to bypass 2FA |

## Login Flow Change

`POST /auth/login` checks `totp_enabled` after password validation:

- **2FA disabled** — existing behavior, returns full JWT immediately
- **2FA enabled** — returns `{ requires2fa: true, pendingToken: "<jwt>" }` instead

The pending token is a short-lived JWT (10 minutes) with an additional claim `type: "2fa-pending"`. It can only be used against the three 2FA completion endpoints. All other endpoints must reject tokens carrying this claim.

## File Structure

New files:
```
src/routes/twoFactor.js
src/controllers/twoFactorController.js
src/models/twoFactorModel.js
```

Modified files:
- `src/config/db.js` — add schema migrations
- `src/controllers/authController.js` — update `login` handler to check `totp_enabled`
- `src/server.js` — mount `twoFactorRoutes` under `/auth`

## Edge Cases & Error Handling

- **Abandoned setup** — `totp_secret` is written on `/auth/2fa/setup` but `totp_enabled` remains `false` until `/auth/2fa/confirm` succeeds. An orphaned secret is harmless.
- **Re-enable** — disabling then re-enabling 2FA deletes old backup codes and issues a fresh set of 8.
- **Clock skew** — otpauth `validate()` with `window: 1` accepts ±1 time window (90 second tolerance).
- **Replay protection** — TOTP codes rotate every 30 seconds; no additional replay tracking is needed.
- **Pending token scope** — enforced via `type: "2fa-pending"` JWT claim. The three 2FA endpoints require it; all other endpoints reject it.
- **Email recovery** — reuses existing `createEmailOtp` / `consumeEmailOtp` infrastructure, inheriting existing rate limiting and 10-minute expiry.
- **Backup code exhaustion** — when all 8 codes are used, only email recovery remains. The user must disable and re-enable 2FA to generate a new set.
