# Notifications

All notification endpoints require a valid account JWT in the `Authorization: Bearer <token>` header.

Base path: `/notifications`

---

## GET `/notifications`

Returns the authenticated account's notifications (newest first, max 50) and their unread count.

**Response**

```json
{
  "notifications": [
    {
      "id": 12,
      "type": "follow",
      "read": false,
      "created_at": "2026-03-19T10:00:00.000Z",
      "post_id": null,
      "actor_id": 7,
      "actor_username": "alice",
      "actor_avatar_url": "https://..."
    },
    {
      "id": 11,
      "type": "reply",
      "read": true,
      "created_at": "2026-03-18T08:30:00.000Z",
      "post_id": 42,
      "actor_id": 9,
      "actor_username": "bob",
      "actor_avatar_url": null
    }
  ],
  "unreadCount": 1
}
```

**Notification types**

| `type`    | Triggered when                                    | `post_id`         |
|-----------|---------------------------------------------------|-------------------|
| `follow`  | Another account follows you                       | `null`            |
| `reply`   | Another account replies to one of your posts      | ID of the reply   |

---

## POST `/notifications/read`

Marks all unread notifications for the authenticated account as read. Idempotent — safe to call even if there are no unread notifications.

**Request body**: none required.

**Response**

```json
{ "success": true }
```

---

## How notifications are created

Notifications are created internally by other controllers — there is no public endpoint to create them directly.

- **Follow**: when account A follows account B, a `follow` notification is inserted with `recipient_id = B`, `actor_id = A`, `post_id = null`.
- **Reply**: when account A replies to a post authored by account B, a `reply` notification is inserted with `recipient_id = B`, `actor_id = A`, `post_id = <reply id>`.

Self-triggered events (following yourself, replying to your own post) still generate notifications at the model level — filter these on the frontend if needed.
