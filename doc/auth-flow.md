## Authentication flow

This backend uses email OTP to verify an email identity, then creates one or more
accounts (usernames) under that identity. Each username has its own password.

### Concepts

- **Identity**: a verified email address. One identity can own multiple accounts.
- **Account**: a username + password profile linked to an identity.
- **OTP**: a one-time code sent to the email to prove ownership.

### Signup flow

1) **Start**: user enters email.
   - `POST /auth/start`
   - Sends an OTP to the email (or logs it in dev).

2) **Verify OTP**: user enters the code.
   - `POST /auth/verify-otp`
   - Returns:
     - `registerToken` (for creating an account)
     - `identityToken` (short-lived, for listing/switching accounts)
     - `accounts` (existing usernames under that email)

3) **Create account**: user chooses a username + password.
   - `POST /auth/register`
   - Creates a new account for that identity.
   - Returns a JWT and redirect info.

### Add another account (same email)

Run the OTP flow again for the same email, then register a new username:

1) `POST /auth/start`
2) `POST /auth/verify-otp` (get `registerToken`)
3) `POST /auth/register` with a new `username`

This adds a second account under the same identity.

### Login

- `POST /auth/login` with `username` + `password`
- Returns a JWT for that account

### Fast switch (no password re-entry)

Use the short-lived `identityToken` from OTP verification:

1) `POST /auth/accounts` to list accounts
2) `POST /auth/switch` with `accountId` to get a new JWT

### Logout

- `POST /auth/logout` with `Authorization: Bearer <JWT>`
- Revokes the token in memory (cleared on server restart)

### Change password (per account)

- `POST /auth/change-password` with `currentPassword` and `newPassword`
- Requires the account JWT

### Change email (privacy-first)

Email changes are verified with OTP to the new address:

1) `POST /auth/request-email-change` (requires JWT)
2) `POST /auth/confirm-email-change` with the OTP

### Reset password (email + username)

Password resets are verified with an OTP sent to the email on the account:

1) `POST /auth/request-password-reset` with `email` + `username`
2) `POST /auth/confirm-password-reset` with `email`, `username`, `otp`, and `newPassword`

### Notes

- OTPs are single-use and expire after 10 minutes.
- Rate limiting: 5 attempts per 10 minutes per email/IP.
- Use `DATABASE_URL` for local or Supabase Postgres.
