# Notification System Design

## Stage 1: API & Real-Time Setup
Built a basic REST API for a campus notification platform (Placements, Events, Results).

Endpoints:
- `GET /api/notifications` (list with filters)
- `PATCH /api/notifications/:id/read` (mark read)
- `GET /api/notifications/priority` (top notifications)

Used Server-Sent Events (SSE) for real-time updates. WebSockets were too complex for just pushing data one-way from the server, and polling is inefficient. SSE `EventSource` handles reconnections automatically.

## Stage 2: Database
Chose PostgreSQL over MongoDB. Notifications and read statuses fit relational tables well, and we needed ACID properties for bulk updates (like "mark all read"). Also native ENUM support for notification types helps.

Schema creates a `students` table and `notifications` table linked by foreign key. Added some indexes on `student_id` and `type`.
Scaling could be an issue later so we might need table partitioning or read replicas.

## Stage 3: Query Optimization
The initial query `SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;` had some problems. 
- Pulled all columns (`*`).
- Wrong sorting (ASC instead of DESC).
- No LIMIT.

Fixed it by adding a composite index `(student_id, is_read, created_at DESC)` and rewriting the query to only select necessary columns with `LIMIT 50`. Also suggested a partial index `WHERE is_read = FALSE` to keep the index size small since we usually query unread items.

## Stage 4: Performance
Hitting the DB on every page load was too slow for 50k students.
Considered:
1. Redis Cache: fast but adds infrastructure.
2. ETag HTTP Caching: saves bandwidth but still hits server.
3. SSE Push: eliminates polling but needs persistent connections.

Ended up combining them: Initial load uses cache/ETag, and then SSE pushes new items so we don't need to poll.

## Stage 5: Bulk Dispatch
The given python pseudocode for sending emails and saving to the DB in a loop was bad. If the email API fails, it crashes the loop, and it's too slow (sequential).

Redesigned it to use a transactional outbox pattern:
1. Bulk insert notifications to the DB.
2. Push jobs to a message queue (email and push queues).
3. Async workers process the queues and retry on failure.
This separates slow email API calls from fast DB writes.

## Stage 6: Priority Inbox
Used a custom formula to rank notifications:
`priorityScore = typeWeight * recencyFactor`
(Placements=3, Results=2, Events=1)

Used a Min-Heap of size N (e.g. 10) to keep the top notifications. This is O(log N) per insert, much faster than sorting the whole array.
Implemented in a standalone script and in the backend.
