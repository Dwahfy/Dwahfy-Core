## Admin badges testing with curl

These examples assume the API is running at `http://localhost:3000` and you have `ADMIN_API_KEY` set.

### List badges (admin)

```bash
curl http://localhost:3000/admin/badges \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Create badge (admin)

```bash
curl -X POST http://localhost:3000/admin/badges \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_API_KEY>" \
  -d '{"slug":"year-1","name":"1 Year","imageUrl":"https://example.com/badges/year-1.png"}'
```

### Update badge (admin)

```bash
curl -X PATCH http://localhost:3000/admin/badges/1 \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_API_KEY>" \
  -d '{"name":"1 Year Member"}'
```

### Delete badge (admin)

```bash
curl -X DELETE http://localhost:3000/admin/badges/1 \
  -H "X-Admin-Key: <ADMIN_API_KEY>"
```
