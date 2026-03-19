## Auth testing with curl

These examples assume the API is running at `http://localhost:3000`.

### Start signup (email only)

```bash
curl -X POST http://localhost:3000/auth/start \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

This sends a 6-digit OTP to the email (or logs it to console in dev).

### Verify OTP

```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","otp":"123456"}'
```

The response includes a `registerToken`, an `identityToken`, and any existing accounts for the email.

### Complete registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"yourname","password":"yourpass123","registerToken":"<TOKEN_FROM_VERIFY>"}'
```

### Login (username + password)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"yourname","password":"yourpass123"}'
```

### List accounts (fast switch)

```bash
curl -X POST http://localhost:3000/auth/accounts \
  -H "Content-Type: application/json" \
  -d '{"identityToken":"<TOKEN_FROM_VERIFY>"}'
```

### Switch account (fast switch)

```bash
curl -X POST http://localhost:3000/auth/switch \
  -H "Content-Type: application/json" \
  -d '{"identityToken":"<TOKEN_FROM_VERIFY>","accountId":123}'
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Change password

```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"currentPassword":"oldpass123","newPassword":"newpass123"}'
```

### Request email change

```bash
curl -X POST http://localhost:3000/auth/request-email-change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"newEmail":"new@example.com"}'
```

### Confirm email change

```bash
curl -X POST http://localhost:3000/auth/confirm-email-change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"newEmail":"new@example.com","otp":"123456"}'
```

### Request password reset

```bash
curl -X POST http://localhost:3000/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"yourname"}'
```

### Confirm password reset

```bash
curl -X POST http://localhost:3000/auth/confirm-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"yourname","otp":"123456","newPassword":"newpass123"}'
```
