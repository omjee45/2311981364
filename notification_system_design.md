# Notification System Design

---

## Stage 1 — REST API Design & Real-Time Notification Mechanism

### Overview

This document describes the REST API contract for a campus notification platform where students receive real-time updates about **Placements**, **Events**, and **Results**. The APIs are designed to be consumed by a React-based frontend.

### Base URL

```
http://localhost:5000/api
```

### Core Actions

| # | Action | Description |
|---|--------|-------------|
| 1 | List notifications | Paginated list with optional type filtering |
| 2 | Get single notification | Fetch a specific notification by ID |
| 3 | Mark as read | Mark one notification as read |
| 4 | Mark all as read | Bulk-mark all notifications as read |
| 5 | Get unread count | Quick count for badge display |
| 6 | Priority inbox | Top-N notifications ranked by importance + recency |

### Endpoints

#### 1. List Notifications

```
GET /api/notifications?page=1&limit=20&notification_type=Placement
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| notification_type | string | — | Filter: "Event", "Result", or "Placement" |

**Response — 200 OK**

```json
{
  "notifications": [
    {
      "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "Type": "Result",
      "Message": "mid-sem results published",
      "Timestamp": "2026-04-22 17:51:30",
      "isRead": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150
  }
}
```

**Headers**

```
Content-Type: application/json
Authorization: Bearer <token>
```

#### 2. Get Single Notification

```
GET /api/notifications/:id
```

**Response — 200 OK**

```json
{
  "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "Type": "Result",
  "Message": "mid-sem results published",
  "Timestamp": "2026-04-22 17:51:30",
  "isRead": true
}
```

#### 3. Mark Notification as Read

```
PATCH /api/notifications/:id/read
```

**Response — 200 OK**

```json
{
  "message": "Notification marked as read",
  "notificationID": "d146095a-0d86-4a34-9e69-3900a14576bc"
}
```

#### 4. Mark All as Read

```
PATCH /api/notifications/read-all
```

**Request Body (optional)**

```json
{
  "notification_type": "Placement"
}
```

**Response — 200 OK**

```json
{
  "message": "All notifications marked as read",
  "updatedCount": 42
}
```

#### 5. Get Unread Count

```
GET /api/notifications/unread-count
```

**Response — 200 OK**

```json
{
  "unreadCount": 14,
  "byType": {
    "Placement": 5,
    "Event": 3,
    "Result": 6
  }
}
```

#### 6. Priority Inbox

```
GET /api/notifications/priority?n=10
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| n | number | 10 | Number of top notifications to return |

**Response — 200 OK**

```json
{
  "priorityNotifications": [
    {
      "ID": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
      "Type": "Placement",
      "Message": "CSX Corporation hiring",
      "Timestamp": "2026-04-22 17:51:18",
      "priorityScore": 0.95,
      "isRead": false
    }
  ],
  "count": 10
}
```

### Real-Time Notification Mechanism

**Approach: Server-Sent Events (SSE)**

SSE was chosen over WebSockets for this use case because:
- Notifications flow in **one direction** (server → client). There's no need for the client to push data back through the same channel.
- SSE works over standard HTTP — no special proxy config, no upgrade handshake, simpler to implement and debug.
- Built-in **auto-reconnect** in the browser. If the connection drops, `EventSource` handles retries automatically.
- Lighter on the server since we're not maintaining a full-duplex connection per user.

**Endpoint**

```
GET /api/notifications/stream
```

**Event Format**

```
event: notification
data: {"ID":"abc123","Type":"Placement","Message":"Google hiring","Timestamp":"2026-04-22 18:00:00"}

event: heartbeat
data: {"status":"alive","timestamp":"2026-04-22 18:00:30"}
```

**Client Implementation**

```javascript
const evtSource = new EventSource("/api/notifications/stream");

evtSource.addEventListener("notification", (e) => {
  const notification = JSON.parse(e.data);
  // update UI — push to notification list, increment badge count, etc.
});

evtSource.addEventListener("heartbeat", (e) => {
  // connection health check
});

evtSource.onerror = () => {
  // EventSource auto-reconnects, but we can add custom retry logic here
};
```

**Why not WebSockets?**

WebSockets would be overkill here. They shine when you need bidirectional communication (chat apps, collaborative editing). For a notification feed that only pushes from server to client, SSE is the right tool — less complexity, fewer moving parts, and native browser support without extra libraries.

**Why not long-polling?**

Long-polling creates unnecessary overhead — repeated TCP handshakes, wasted bandwidth from headers on each request, and harder to manage connection state on the server side. SSE gives us a persistent connection with lower overhead.

---

## Stage 2 — Database Design

### Database Choice: PostgreSQL

For a notification system at campus scale, I'd go with **PostgreSQL** over MongoDB. Here's why:

1. **Relational integrity** — Students, notifications, and read-status form natural relationships. Foreign keys and joins are cleaner than embedding or denormalizing.
2. **Filtering and sorting** — The API needs efficient `WHERE` + `ORDER BY` combos (unread notifications, type filtering, date ranges). PostgreSQL's query planner and indexing handle this well.
3. **ACID guarantees** — When marking 50,000 notifications as read in one go, we need transactional safety.
4. **Mature tooling** — pgAdmin, EXPLAIN ANALYZE, partial indexes, covering indexes — all battle-tested for debugging performance.
5. **ENUM support** — Native enum types for notification_type map directly to our domain.

### Schema

```sql
-- notification type enum
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

-- students table
CREATE TABLE students (
    student_id    SERIAL PRIMARY KEY,
    name          VARCHAR(100)   NOT NULL,
    email         VARCHAR(150)   UNIQUE NOT NULL,
    roll_no       VARCHAR(20)    UNIQUE NOT NULL,
    created_at    TIMESTAMP      DEFAULT NOW()
);

-- notifications table
CREATE TABLE notifications (
    notification_id   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id        INT            NOT NULL REFERENCES students(student_id),
    type              notification_type NOT NULL,
    message           TEXT           NOT NULL,
    is_read           BOOLEAN        DEFAULT FALSE,
    created_at        TIMESTAMP      DEFAULT NOW(),
    read_at           TIMESTAMP      NULL
);

-- indexes for common query patterns
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX idx_notifications_type
    ON notifications (type, created_at DESC);

CREATE INDEX idx_notifications_student_type
    ON notifications (student_id, type, created_at DESC);
```

### Scaling Challenges

| Problem | Impact | Solution |
|---------|--------|----------|
| Table grows into hundreds of millions of rows | Queries slow down, sequential scans become expensive | **Table partitioning** by `created_at` (monthly partitions) |
| Read-heavy workload overwhelms primary | Write latency increases under load | **Read replicas** — route all SELECT queries to replicas |
| Frequent full-table scans on unread notifications | High I/O, slow response times | **Partial indexes** (index only `is_read = FALSE` rows) |
| Old notifications never accessed but still in main table | Bloated indexes, slower vacuuming | **Archival strategy** — move notifications older than 6 months to an archive table |
| Hot rows (popular students with many notifications) | Lock contention on updates | **Batch updates** with advisory locks |

### Queries for Designed APIs

**1. List notifications (paginated, with optional type filter)**

```sql
SELECT notification_id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
  AND ($2::notification_type IS NULL OR type = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

**2. Get single notification**

```sql
SELECT notification_id, type, message, is_read, created_at, read_at
FROM notifications
WHERE notification_id = $1 AND student_id = $2;
```

**3. Mark as read**

```sql
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE notification_id = $1 AND student_id = $2 AND is_read = FALSE;
```

**4. Mark all as read**

```sql
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = $1
  AND is_read = FALSE
  AND ($2::notification_type IS NULL OR type = $2);
```

**5. Unread count (with breakdown by type)**

```sql
SELECT type, COUNT(*) as count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE
GROUP BY type;
```

**6. Total count for pagination**

```sql
SELECT COUNT(*) FROM notifications
WHERE student_id = $1
  AND ($2::notification_type IS NULL OR type = $2);
```

---

## Stage 3 — Query Analysis

### The Query in Question

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### Is this query accurate?

Functionally, it fetches unread notifications for a given student — so the logic is correct. But there are several issues:

1. **`SELECT *`** — Pulls every column including any BLOBs or rarely-used fields. This wastes memory and network bandwidth. Select only what you need.
2. **`ORDER BY createdAt ASC`** — Ascending order means oldest notifications first. For a notification feed, users almost always want **newest first** (DESC). This is likely a bug.
3. **No `LIMIT` clause** — With 5 million rows total, a single student could have thousands of unread notifications. Returning them all in one shot is dangerous — it could blow up memory on the application server.
4. **Column naming** — `studentID`, `isRead`, `createdAt` use camelCase which is unusual for SQL. PostgreSQL would fold these to lowercase unless double-quoted, which causes subtle bugs.

### Why is it slow?

With 50,000 students and 5,000,000 notifications:

1. **No composite index** — Without an index on `(studentID, isRead, createdAt)`, the database does a **sequential scan** across all 5 million rows, filtering row by row.
2. **Sorting without index support** — The `ORDER BY createdAt` forces a **filesort** operation on the filtered results. Without index-backed ordering, this spills to disk for large result sets.
3. **Returning all columns** — `SELECT *` prevents the optimizer from using a **covering index** (where the answer can come entirely from the index without touching the actual table rows).

**Estimated cost without index**: ~5,000,000 row scans × filter cost ≈ O(N) full table scan.

### What to change

```sql
-- step 1: add a composite index
CREATE INDEX idx_student_unread_time
    ON notifications (studentID, isRead, createdAt DESC);

-- step 2: rewrite the query
SELECT notification_id, type, message, created_at
FROM notifications
WHERE studentID = 1042 AND isRead = FALSE
ORDER BY createdAt DESC
LIMIT 50;
```

**After indexing**: The database does an **index seek** on `(studentID=1042, isRead=FALSE)`, which narrows to maybe a few hundred rows. The `createdAt DESC` ordering comes free from the index. The `LIMIT 50` caps the result.

**Cost comparison**:

| Metric | Before | After |
|--------|--------|-------|
| Rows scanned | ~5,000,000 | ~50 (from index) |
| Sort operation | filesort on disk | index-ordered (free) |
| Data transferred | all columns × all rows | 4 columns × 50 rows |
| Time complexity | O(N) | O(log N + K) where K = limit |

For even better performance, a **partial index** works well here since we're always filtering on `isRead = FALSE`:

```sql
CREATE INDEX idx_student_unread_partial
    ON notifications (studentID, createdAt DESC)
    WHERE isRead = FALSE;
```

This index is smaller (only unread rows), faster to scan, and cheaper to maintain.

### "Add indexes on every column" — Is this good advice?

**No.** This is counterproductive. Here's why:

1. **Write overhead** — Every `INSERT`, `UPDATE`, or `DELETE` must now update every single index. With 50k students getting frequent notifications, this tanks write performance.
2. **Storage bloat** — Each index is a separate B-tree structure on disk. Indexing every column on a 5-million-row table could easily double or triple storage usage.
3. **Optimizer confusion** — Too many indexes can cause the query planner to pick suboptimal execution plans. It has to evaluate more options, and sometimes it gets it wrong.
4. **Maintenance cost** — `VACUUM` and `REINDEX` operations take longer. Index bloat over time requires periodic maintenance.

**The right approach**: Create **targeted composite indexes** that match your actual query patterns. One well-designed composite index beats ten single-column indexes.

### Students with Placement Notifications in Last 7 Days

Using the column names from the existing table (`notificationType`, `studentID`, `createdAt`):

```sql
SELECT DISTINCT s.student_id, s.name, s.email, s.roll_no
FROM students s
INNER JOIN notifications n ON s.student_id = n.studentID
WHERE n.notificationType = 'Placement'
  AND n.createdAt >= NOW() - INTERVAL '7 days';
```

Supporting index:

```sql
CREATE INDEX idx_notif_placement_recent
    ON notifications (notificationType, createdAt DESC)
    WHERE notificationType = 'Placement';
```

---

## Stage 4 — Performance Optimization for Page-Load Fetching

### The Problem

Every time a student loads any page, the app hits the database for their notifications. With 50,000 active students, this creates:
- Thousands of concurrent DB queries during peak hours (class breaks, result days)
- Connection pool exhaustion
- Slow page loads → bad UX → students stop checking notifications

### Solution 1: Redis Caching Layer

Cache each student's unread notifications in Redis with a TTL.

```
Key:   notifications:unread:{studentID}
Value: JSON array of notification objects
TTL:   60 seconds
```

**Flow**:
1. Page loads → backend checks Redis first
2. Cache hit → return immediately (sub-millisecond)
3. Cache miss → query DB, store in Redis, return to client
4. New notification arrives → invalidate that student's cache key

**Tradeoffs**:
- **Pro**: Massive reduction in DB load — 90%+ cache hit rate during normal usage
- **Pro**: Sub-millisecond reads from Redis vs 10-50ms from DB
- **Con**: Adds infrastructure complexity (Redis cluster, memory management)
- **Con**: Slight staleness — a notification might take up to TTL seconds to appear
- **Con**: Cache invalidation is tricky — need to invalidate on every write

### Solution 2: HTTP Caching with ETag/Last-Modified

Use conditional HTTP requests so the browser doesn't even hit the backend if nothing changed.

```
Response Headers:
  ETag: "hash-of-notification-state"
  Cache-Control: private, max-age=30

Subsequent Request Headers:
  If-None-Match: "hash-of-notification-state"
```

If nothing changed, the server returns **304 Not Modified** with no body — saving bandwidth and rendering time.

**Tradeoffs**:
- **Pro**: No extra infrastructure needed
- **Pro**: Saves bandwidth for unchanged data
- **Con**: Still hits the server on every request (just returns faster)
- **Con**: Requires computing the ETag efficiently

### Solution 3: SSE for Real-Time Push (replaces polling entirely)

Instead of fetching on page load, maintain an SSE connection:
- On initial page load, fetch the current state once
- After that, new notifications arrive as push events — **no further page-load queries**

**Tradeoffs**:
- **Pro**: Eliminates repeated polling entirely
- **Pro**: Instant notification delivery
- **Con**: Requires persistent connections — 50k concurrent SSE connections needs careful server tuning
- **Con**: Mobile browsers sometimes kill background connections

### Recommended Architecture

Combine all three for layered defense:

```
[Browser Cache + ETag] → [Redis Cache] → [DB + Read Replica]
       ↑
  [SSE Push for real-time updates]
```

1. First page load: fetch from backend (Redis → DB fallback), set ETag
2. Subsequent loads: browser sends `If-None-Match`, gets 304 if unchanged
3. Real-time: SSE pushes new notifications as they arrive
4. Background: Redis cache auto-expires, re-fills on next request

---

## Stage 5 — Bulk Notification Dispatch

### The Pseudocode Under Review

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

### Shortcomings

1. **Sequential processing** — Iterating one-by-one over 50,000 students. If each iteration takes 100ms (email API latency), that's 5,000 seconds (~83 minutes). Completely unusable.

2. **No error handling** — If `send_email` fails on student #25,001, we don't know which students succeeded. We can't resume or retry.

3. **Tight coupling** — Email, DB write, and push notification happen in the same loop. A slow email API blocks the DB insert and push for the same student.

4. **No idempotency** — If the process crashes at student #30,000 and we restart, students #1-30,000 get duplicate emails.

5. **Single point of failure** — Runs on one server. If it goes down midway, partial state with no recovery.

6. **No backpressure** — Hammering the email API with 50k requests can trigger rate limits or IP blocks.

### Email Failed for 200 Students — What Now?

With the current implementation, there's no good answer. We'd have to:
- Manually identify which 200 students failed (if we even have logs)
- Rerun the entire function (causing duplicates for the other 49,800)

This is unacceptable. We need a system that tracks per-student delivery status.

### Should DB Save and Email Happen Together?

**No.** They should be decoupled. Reasons:

1. **Different reliability profiles** — DB writes are fast and local. Email is a remote API call that can timeout, rate-limit, or fail silently. Coupling them means a flaky email service blocks your database writes.

2. **Different latency** — DB insert: ~5ms. Email API call: ~200ms. Keeping them together means the faster operation waits on the slower one.

3. **Different retry semantics** — Failed DB write = critical error (notification was never recorded). Failed email = retry later (the notification still exists, just wasn't emailed yet). Mixing them makes retry logic complicated.

4. **Transactional outbox pattern** — Save to DB first (within a transaction), then publish a "send email" event. If the email fails, the notification is still in the DB and the email can be retried independently.

### Redesigned Solution

```python
# --- step 1: bulk insert notifications into DB (fast, atomic) ---
function notify_all(student_ids, message, notification_type):
    batch_id = generate_uuid()

    # single bulk insert — not a loop
    notification_records = []
    for student_id in student_ids:
        notification_records.append({
            "id": generate_uuid(),
            "student_id": student_id,
            "message": message,
            "type": notification_type,
            "batch_id": batch_id,
            "email_status": "pending",
            "push_status": "pending",
            "created_at": now()
        })

    bulk_insert_to_db(notification_records)  # one query, not 50k

    # step 2: enqueue jobs for email and push
    for record in notification_records:
        email_queue.enqueue({
            "job_id": record["id"],
            "student_id": record["student_id"],
            "message": message,
            "retry_count": 0
        })

        push_queue.enqueue({
            "job_id": record["id"],
            "student_id": record["student_id"],
            "message": message
        })

    # step 3: broadcast SSE event to connected clients
    sse_broadcast({
        "type": notification_type,
        "message": message,
        "batch_id": batch_id
    })

    return {"batch_id": batch_id, "total": len(student_ids)}


# --- email worker (runs on separate processes/servers) ---
function email_worker():
    while true:
        job = email_queue.dequeue()  # blocks until a job is available

        try:
            send_email(job["student_id"], job["message"])
            update_db_status(job["job_id"], "email_status", "sent")

        except RateLimitError:
            # back off and re-enqueue with delay
            email_queue.enqueue_with_delay(job, delay=30_seconds)

        except Exception as e:
            job["retry_count"] += 1
            if job["retry_count"] < 3:
                email_queue.enqueue_with_delay(job, delay=exponential_backoff(job["retry_count"]))
            else:
                # exhausted retries — move to dead letter queue
                dead_letter_queue.enqueue(job)
                update_db_status(job["job_id"], "email_status", "failed")
                log("error", f"Email permanently failed for student {job['student_id']}: {e}")


# --- push notification worker ---
function push_worker():
    while true:
        job = push_queue.dequeue()
        try:
            push_to_app(job["student_id"], job["message"])
            update_db_status(job["job_id"], "push_status", "sent")
        except Exception as e:
            # push failures are less critical — log and move on
            update_db_status(job["job_id"], "push_status", "failed")
            log("warn", f"Push failed for student {job['student_id']}: {e}")


# --- helper ---
function exponential_backoff(retry_count):
    return (2 ** retry_count) * 1000  # 2s, 4s, 8s, etc.
```

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| DB writes | 50,000 individual inserts | 1 bulk insert |
| Email dispatch | Sequential in loop | Async queue with workers |
| Error handling | None | Per-job retry with exponential backoff |
| Failure recovery | Start over | Dead letter queue + status tracking |
| Idempotency | None | job_id-based dedup |
| Scalability | 1 process | Multiple workers, horizontally scalable |
| Total time (est.) | ~83 min | DB: ~2s, emails: ~5min (with 10 workers) |

---

## Stage 6 — Priority Inbox Implementation

### Approach

The priority score for each notification is calculated using a weighted combination of **type importance** and **recency**:

```
priorityScore = typeWeight × recencyFactor
```

**Type Weights** (placement > result > event):

| Type | Weight |
|------|--------|
| Placement | 3.0 |
| Result | 2.0 |
| Event | 1.0 |

**Recency Factor**: A decay function based on how old the notification is. Newer notifications score higher.

```
recencyFactor = 1 / (1 + hoursElapsed × 0.1)
```

This gives a smooth decay — a notification from 1 hour ago scores ~0.91, from 10 hours ago ~0.50, from 24 hours ago ~0.29.

### Maintaining Top-N Efficiently

For maintaining the top 10 as new notifications arrive:

1. Use a **min-heap** of size N (here N=10).
2. The heap root always holds the lowest-priority item among the top 10.
3. When a new notification arrives:
   - Calculate its priority score.
   - If the heap has fewer than N items, insert directly.
   - If the new score > heap root's score, replace the root and re-heapify.
   - Otherwise, discard — it's not in the top 10.
4. Time complexity: **O(log N)** per insertion, where N is small (10-20).

This is much better than re-sorting the entire list on every new notification (O(M log M) where M could be thousands).

### Implementation

The standalone script is at `stage6_priority_inbox.js` in the repository root. It:
1. Authenticates with the evaluation service API
2. Fetches all available notifications across multiple pages
3. Computes priority scores using the formula above
4. Extracts the top 10 using a min-heap and prints them ranked

Output screenshot: `stage6_output.png`

The same priority logic is reused in `notification_app_be/src/priority.js` and served via the backend API at `GET /api/notifications/priority?n=10`.
