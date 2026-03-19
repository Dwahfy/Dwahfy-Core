# 2FA TOTP Design

## Overview

Add opt-in TOTP-based two-factor authentication to Dwahfy-Core using the `otpauth` package. Users can enable 2FA per account (per username, not per identity/email). Recovery is available via both backup codes and email OTP fallback.

## Database Schema

### Additions to `accounts` table (migrations in `src/config/db.js`)

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS totp_last_verified_at TIMESTAMPTZ;
```

`totp_secret` is stored as plaintext. The database itself is the access control boundary — the value is never exposed in API responses and is not more sensitive than a bcrypt password hash already stored in the same row. No application-level encryption is added.

`totp_last_verified_at` is used for replay protection: after a successful TOTP verification the column is updated to `NOW()`, and any subsequent TOTP code submitted within the same 90-second acceptance window is rejected. The 90-second figure is derived from `period (30s) × (window × 2 + 1)` — if the `window` parameter passed to `otpauth` changes, this threshold must be updated to match.

### New `totp_backup_codes` table

```sql
CREATE TABLE IF NOT EXISTS totp_backup_codes (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_account_id
  ON totp_backup_codes(account_id);
```

Backup codes are bcrypt-hashed before storage. 8 codes are generated at setup confirmation. Old codes are deleted and replaced when the user disables then re-enables 2FA.

## Pending Token

When login requires 2FA, a short-lived JWT is issued with the following payload:

```json
{
  "type": "2fa-pending",
  "accountId": 123,
  "identityId": 456,
  "isAdmin": false,
  "exp": "<10 minutes from now>"
}
```

**Scope enforcement:** `requireAccountToken` in `src/utils/authToken.js` is updated to explicitly reject any token where `decoded.type === "2fa-pending"`. A new `requirePendingToken` middleware accepts only tokens where `decoded.type === "2fa-pending"`. This ensures a pending token cannot be used to access any regular authenticated endpoint.

## Endpoints

All mounted under `/auth` via the new `twoFactor` router. The existing rate-limiter (`src/utils/rateLimit.js`) is applied to all TOTP and backup-code verification endpoints to prevent brute-force attacks.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/2fa/setup` | Account JWT | Generate TOTP secret, return `otpauth://` URI for QR display. Overwrites any unconfirmed secret. Returns `409` if `totp_enabled` is already `true`. |
| `POST` | `/auth/2fa/confirm` | Account JWT | Verify first TOTP code, activate 2FA, return 8 plaintext backup codes (shown once). Returns `409` if `totp_enabled` is already `true`. |
| `POST` | `/auth/2fa/disable` | Account JWT | Disable 2FA — requires `password` + `totpCode` in body. |
| `POST` | `/auth/2fa/verify` | Pending token | Submit TOTP code to complete login — returns full account JWT on success. |
| `POST` | `/auth/2fa/recover/email` | Pending token | Send email OTP to the account's registered email to bypass 2FA for login. |
| `POST` | `/auth/2fa/recover/email/verify` | Pending token | Submit the email OTP — returns a full account JWT on success. |
| `POST` | `/auth/2fa/recover/backup` | Pending token | Use one of the 8 backup codes to bypass 2FA — returns a full account JWT on success. |
| `POST` | `/auth/2fa/disable-via-email` | Account JWT | Request email OTP to disable 2FA without a TOTP code (lost-authenticator recovery). |
| `POST` | `/auth/2fa/confirm-disable` | Account JWT | Submit the email OTP from the above step and complete disabling 2FA. |

### Email recovery — address resolution

`POST /auth/2fa/recover/email` receives a pending token. The controller extracts `identityId` from the token, looks up the email from the `identities` table via `getIdentityById`, and calls `createEmailOtp(email, ...)`. Verification on `/auth/2fa/recover/email/verify` follows the same pattern as existing email OTP endpoints and returns a full account JWT on success.

## Login Flow Change

`POST /auth/login` checks `totp_enabled` after password validation:

- **2FA disabled** — existing behaviour, returns full JWT immediately.
- **2FA enabled** — returns `{ "requires2fa": true, "pendingToken": "<jwt>" }` instead.

## TOTP Replay Protection

After a TOTP code is successfully validated on any endpoint:

1. `accounts.totp_last_verified_at` is set to `NOW()`.
2. On the next verification attempt, the server rejects the code if `NOW() - totp_last_verified_at < 90 seconds`.

This prevents reuse of a captured code within the same acceptance window.

## Lost-Authenticator Recovery

Users who lose their authenticator app and have consumed all backup codes can still recover via the email login recovery path:

1. Attempt login normally — receive a pending token.
2. Call `POST /auth/2fa/recover/email` to send an OTP to the registered email.
3. Call `POST /auth/2fa/recover/email/verify` with the OTP — receives a full account JWT.
4. With that JWT, call `POST /auth/2fa/disable-via-email` to request a second email OTP.
5. Call `POST /auth/2fa/confirm-disable` to fully disable 2FA.

This ensures no user can be permanently locked out purely through software failure.

## File Structure

New files:

```text
src/routes/twoFactor.js
src/controllers/twoFactorController.js
src/models/twoFactorModel.js
```

Modified files:

- `src/config/db.js` — add schema migrations
- `src/controllers/authController.js` — update `login` to check `totp_enabled` and issue pending token
- `src/utils/authToken.js` — update `requireAccountToken` to reject `type: "2fa-pending"`; add `requirePendingToken`
- `src/server.js` — mount `twoFactorRoutes` under `/auth`

## Edge Cases

- **Abandoned setup** — `totp_secret` is written on `/auth/2fa/setup` but `totp_enabled` stays `false` until `/auth/2fa/confirm` succeeds. A subsequent `/auth/2fa/setup` call silently overwrites the old secret, which is safe.
- **Re-enable** — disabling then re-enabling 2FA deletes old backup codes and issues a fresh set of 8.
- **Backup code exhaustion** — when all 8 codes are used, email login recovery and the email-based disable flow remain available. No auto-regeneration; the user must disable and re-enable 2FA.
- **`DELETE` verb avoided** — `POST /auth/2fa/disable` is used instead of `DELETE` for consistency with the rest of the codebase and to avoid clients that drop the body on `DELETE` requests.
