## Profile testing with curl

These examples assume the API is running at `http://localhost:3000` and you have a JWT from login/registration.

### Get current profile

```bash
curl http://localhost:3000/profile \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Update profile

```bash
curl -X PATCH http://localhost:3000/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"displayName":"Sky","bio":"Builder","avatarUrl":"https://example.com/avatar.png","links":["https://example.com","https://x.com/you"],"badgeId":1,"badWordsEnabled":false}'
```

### Public profile by username

```bash
curl http://localhost:3000/profile/yourname
```

### List badges

```bash
curl http://localhost:3000/badges
```
