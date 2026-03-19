## Posts testing with curl

These examples assume the API is running at `http://localhost:3000` and you have a JWT from login/registration.

### Create a text post

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"content":"Hello Dwahfy"}'
```

### List posts

```bash
curl http://localhost:3000/posts
```

### Reply to a post

```bash
curl -X POST http://localhost:3000/posts/1/replies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"content":"Nice post!"}'
```

### List replies for a post

```bash
curl http://localhost:3000/posts/1/replies
```

### Like or dislike a post

```bash
curl -X POST http://localhost:3000/posts/1/react \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"reaction":"like"}'
```
