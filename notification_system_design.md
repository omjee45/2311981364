# Notification System Design

---

## Stage 1 — REST API Design & Real-Time Notification Mechanism

### Overview

The goal of this module is to define a clear REST API contract for a campus notification platform. Students receive real-time updates about **Placements**, **Events**, and **Results**, and the frontend is built with React. I designed these endpoints keeping in mind how the frontend components would consume them — every response shape maps directly to a UI element (notification list, badge count, priority feed).

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

For pushing notifications to connected clients I went with **Server-Sent Events (SSE)**.

The main reason is that our notification system is strictly one-way — the server pushes updates to the browser and the client never needs to send anything back on the same channel. Given this, SSE felt like the simplest option that still does the job properly. It runs on plain HTTP so there is no WebSocket upgrade handshake to deal with, no special proxy rules, and the browser's `EventSource` API handles reconnection out of the box if the connection drops. On the server side it is also lighter since we only maintain a half-duplex stream instead of a full bidirectional socket per user.

I considered WebSockets initially but they are built for two-way communication (things like chat apps or collaborative editors where both sides are constantly sending data). For a read-only feed like notifications, adding WebSocket infrastructure felt like extra complexity for no real gain. Long-polling was the other option I looked at — the problem there is that each poll is a separate HTTP request with full headers, a new TCP handshake every time, and the server has to manage a lot of half-open connections waiting on timeouts. SSE avoids all of that with a single persistent connection.

**Reference**: MDN Web Docs on [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) and the [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource).

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

---

## Stage 2 — Database Design

### Why PostgreSQL

I picked **PostgreSQL** for this project after weighing it against MongoDB. The data model has clear relationships — students own notifications, each notification has a read-status — and these map naturally to relational tables with foreign keys. MongoDB would work too, but for a system where the primary access patterns are filtered queries (unread notifications by type, date-range sorts, paginated lists), PostgreSQL's query planner and B-tree indexes are hard to beat. I also needed transactional safety for bulk operations like marking all notifications as read — ACID compliance matters when you are updating thousands of rows at once and cannot afford partial failures.

Practically, PostgreSQL also has native ENUM support which maps directly to our notification types, and tools like `EXPLAIN ANALYZE` made it easier to debug query performance during development.

**References**: PostgreSQL docs on [indexes](https://www.postgresql.org/docs/current/indexes.html), [partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html), and [ENUM types](https://www.postgresql.org/docs/current/datatype-enum.html).

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

The first index is a **partial index** — it only covers rows where `is_read = FALSE`. Since the vast majority of queries in a notification system target unread items, this keeps the index small and fast. The second and third indexes cover the type-filtering and combined student+type access patterns used by the list API.

### Scaling Challenges

At campus scale (say 50,000 students with millions of notifications over time), a few problems come up:

- **Table growth**: As notifications pile up into hundreds of millions of rows, even indexed queries slow down because the B-tree gets deeper and vacuuming takes longer. The fix is **table partitioning** by `created_at` — I would partition by month so that queries on recent notifications only scan the current partition.

- **Read-heavy load**: During peak hours (result days, placement season) the primary database gets hammered with reads. Adding **read replicas** and routing SELECT queries to them keeps the primary free for writes.

- **Stale data in indexes**: Partial indexes on `is_read = FALSE` need to be maintained on every UPDATE. Using **batch updates with advisory locks** reduces contention when bulk-marking notifications as read.

- **Old data bloat**: Notifications older than 6 months are rarely accessed but still bloat the main table. An **archival strategy** (moving old rows to a separate archive table) keeps the hot dataset small.

**Reference**: "Designing Data-Intensive Applications" by Martin Kleppmann, Chapter 3 — on B-tree indexes, partitioning strategies, and storage engine internals.

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

### Problems with This Query

Looking at this query, the logic is fine — it fetches unread notifications for a particular student — but there are multiple issues that would hurt it in production.

First, `SELECT *` is pulling every column from the table, including fields that the client might not even display. This wastes bandwidth and memory, especially if the table has large TEXT or BLOB columns down the line. It also blocks the query planner from using a covering index (where the result is served entirely from the index without hitting the heap).

Second, `ORDER BY createdAt ASC` sorts oldest-first. In a notification feed, users expect to see the newest items first. This is most likely a mistake — it should be DESC.

Third, there is no `LIMIT`. If student 1042 has 10,000 unread notifications, all of them get loaded into memory and sent over the wire. This can crash the application server or at least cause a very slow response.

Finally, the column names (`studentID`, `isRead`, `createdAt`) use camelCase. PostgreSQL folds unquoted identifiers to lowercase, so unless these columns are defined with double quotes in the schema, the query will fail silently or match the wrong columns. It is better to use snake_case (`student_id`, `is_read`, `created_at`) to match PostgreSQL conventions.

### Why It Is Slow on 5 Million Rows

Assuming 50,000 students and 5,000,000 notifications with no composite index:

The database has to do a **full sequential scan** over all 5 million rows, checking each one to see if `studentID = 1042 AND isRead = false`. That is O(N) where N = 5,000,000. After filtering, the remaining rows need to be sorted by `createdAt`, which forces a **filesort** — and if the result set is large enough, this sort spills to disk, which is even slower. On top of that, `SELECT *` means the database reads every column from every matching row, preventing any index-only scan optimization.

**Reference**: PostgreSQL docs on [EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) and [index scan types](https://www.postgresql.org/docs/current/indexes-types.html).

### Fixed Version

```sql
-- step 1: add a composite index that matches the query pattern
CREATE INDEX idx_student_unread_time
    ON notifications (studentID, isRead, createdAt DESC);

-- step 2: rewrite the query with specific columns, correct sort, and a limit
SELECT notification_id, type, message, created_at
FROM notifications
WHERE studentID = 1042 AND isRead = FALSE
ORDER BY createdAt DESC
LIMIT 50;
```

With this index in place, the database performs an **index seek** directly to the entries for student 1042 where isRead = FALSE. The DESC ordering on `createdAt` is already baked into the index, so no additional sort is needed. The LIMIT 50 caps how many rows are actually fetched.

| Metric | Before (no index) | After (composite index + limit) |
|--------|--------|-------|
| Rows scanned | ~5,000,000 (full table) | ~50 (from index) |
| Sort operation | filesort (possibly on disk) | none (index-ordered) |
| Data transferred | all columns × all matching rows | 4 columns × 50 rows |
| Time complexity | O(N) | O(log N + K) where K = limit |

An even better approach for this specific pattern is a **partial index**, since we always filter on `isRead = FALSE`:

```sql
CREATE INDEX idx_student_unread_partial
    ON notifications (studentID, createdAt DESC)
    WHERE isRead = FALSE;
```

This partial index only stores entries where `isRead = FALSE`, so it is smaller, uses less disk space, and is faster to scan than a full index.

### Should You Index Every Column?

No. I initially thought more indexes = faster queries, but that is wrong for several reasons:

1. **Write penalty**: Every INSERT, UPDATE, or DELETE now has to update every index on the table. With 50k students receiving frequent notifications, the write path gets significantly slower.

2. **Storage cost**: Each index is a separate B-tree on disk. Indexing all columns on a 5-million-row table could easily double or triple storage usage, which also means longer backup times.

3. **Planner overhead**: The query planner has to evaluate all available indexes for each query. With too many indexes, it sometimes picks a suboptimal plan — I have actually seen this happen in class demos where adding a redundant index made a query slower.

4. **Maintenance**: Operations like VACUUM and REINDEX take proportionally longer with more indexes.

The better approach is to create **targeted composite indexes** that match actual query patterns. One well-designed composite index that covers WHERE + ORDER BY + SELECT columns is more effective than multiple single-column indexes.

**Reference**: "Use The Index, Luke" — https://use-the-index-luke.com/ (covers composite index design patterns and common mistakes).

### Finding Students with Placement Notifications in Last 7 Days

```sql
SELECT DISTINCT s.student_id, s.name, s.email, s.roll_no
FROM students s
INNER JOIN notifications n ON s.student_id = n.studentID
WHERE n.notificationType = 'Placement'
  AND n.createdAt >= NOW() - INTERVAL '7 days';
```

Supporting index for this query:

```sql
CREATE INDEX idx_notif_placement_recent
    ON notifications (notificationType, createdAt DESC)
    WHERE notificationType = 'Placement';
```

---

## Stage 4 — Performance Optimization for Page-Load Fetching

### The Problem

Every page load triggers a database query for the current student's notifications. With 50,000 active students, this generates a large volume of concurrent DB connections, especially during peak hours (exam results day, placement announcements). The practical effects are connection pool exhaustion, slow page loads, and degraded user experience.

I looked at three approaches to address this, each operating at a different layer.

### Approach 1 — Redis Caching Layer

The idea is to cache each student's unread notifications in Redis with a short TTL so that repeated page loads within a window do not hit the database at all.

```
Key:   notifications:unread:{studentID}
Value: JSON array of notification objects
TTL:   60 seconds
```

On page load, the backend checks Redis first. On a cache hit, the response comes back in under a millisecond. On a miss, the backend queries the database, stores the result in Redis, and returns it to the client. When a new notification arrives, the corresponding student's cache key is invalidated so the next request gets fresh data.

The downside is added infrastructure — Redis needs to be deployed and monitored, and cache invalidation logic has to be implemented carefully to avoid stale data. There is also a slight staleness window: a notification could take up to 60 seconds to show up if the TTL has not expired yet.

**Reference**: Redis documentation on [caching patterns](https://redis.io/docs/manual/patterns/) and [TTL-based expiry](https://redis.io/commands/expire).

### Approach 2 — HTTP Caching with ETag

This approach uses conditional HTTP requests. The server includes an `ETag` header (a hash of the notification state) in the response. On the next request, the browser sends `If-None-Match` with the stored ETag. If nothing has changed, the server returns a **304 Not Modified** response with no body, saving bandwidth.

```
Response Headers:
  ETag: "hash-of-notification-state"
  Cache-Control: private, max-age=30

Subsequent Request Headers:
  If-None-Match: "hash-of-notification-state"
```

The advantage is that no extra infrastructure is needed — it works with standard HTTP. The limitation is that the request still reaches the server (it just returns faster when nothing has changed), so it does not eliminate database load the way Redis does.

### Approach 3 — SSE Push (Eliminate Polling)

Since we already have SSE set up for real-time notifications, we can use it to eliminate page-load fetching entirely. The flow: on the first page load, fetch the current notification state once. After that, any new notifications arrive as SSE push events without the client needing to poll or refetch.

The challenge is that maintaining 50,000 concurrent SSE connections requires careful server tuning (file descriptor limits, keep-alive configuration). Mobile browsers also tend to kill background connections aggressively, so a fallback mechanism is needed.

### What I Went With

For the actual implementation, I combined all three as a layered strategy:

```
[Browser Cache + ETag] → [Redis Cache] → [DB + Read Replica]
       ↑
  [SSE Push for real-time updates]
```

The first page load goes through Redis (falling back to DB). Subsequent loads use ETag validation. Real-time updates come through SSE. This way, each layer reduces the load on the one below it.

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

### What Is Wrong Here

This implementation processes each student sequentially — email, then DB save, then push — one at a time. With 50,000 students, if each iteration takes around 100ms (mostly email API latency), the total time comes out to roughly 5,000 seconds, which is over 80 minutes. That is unusable for any real scenario.

Beyond speed, there are other problems:

**No error handling at all.** If the email API fails for student #25,001, the loop crashes and we have no record of which students received their emails and which did not. The 24,999 students after the failure point get nothing.

**Email and DB save are coupled.** These have very different latency profiles — a DB insert takes around 5ms while an email API call can take 200ms or more. Tying them together in the same loop means the fast operation is always waiting on the slow one.

**No idempotency.** If the process crashes at student #30,000 and we restart it from the beginning, the first 30,000 students receive duplicate emails. There is no deduplication mechanism.

**No rate limiting.** Firing 50,000 email API calls in rapid succession will likely trigger rate limits or get the sending IP blocked by the email provider.

### How to Handle 200 Failed Emails

With the current code, there is no way to identify which 200 students failed. The only option would be to rerun the entire function, which sends duplicate emails to the 49,800 students who already received theirs. This is not acceptable — we need per-student delivery status tracking.

### Should DB Save and Email Be in the Same Operation?

No, and the reason comes down to the fact that they have different failure modes. A DB write is fast, local, and reliable — if it fails, something is seriously wrong with the infrastructure. An email is a remote API call that can timeout, get rate-limited, or fail silently. If we couple them, a flaky email service blocks database writes, and retry logic becomes very complicated because we would need to figure out which operation failed for each student.

The better pattern (sometimes called the **transactional outbox pattern**, described in the "Designing Data-Intensive Applications" book, Chapter 11) is: save to the database first within a transaction, then publish a "send email" event to a queue. If the email fails later, the notification record still exists in the database and the email can be retried independently.

### Redesigned Solution

```python
# --- step 1: bulk insert all notification records (single DB operation) ---
function notify_all(student_ids, message, notification_type):
    batch_id = generate_uuid()

    # build records in memory, then insert in one batch query
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

    bulk_insert_to_db(notification_records)  # single query instead of 50k

    # step 2: push individual jobs to async queues
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

    # step 3: broadcast SSE event to currently connected clients
    sse_broadcast({
        "type": notification_type,
        "message": message,
        "batch_id": batch_id
    })

    return {"batch_id": batch_id, "total": len(student_ids)}


# --- email worker (separate process, can run multiple instances) ---
function email_worker():
    while true:
        job = email_queue.dequeue()  # blocks until job available

        try:
            send_email(job["student_id"], job["message"])
            update_db_status(job["job_id"], "email_status", "sent")

        except RateLimitError:
            # provider is throttling us, back off and retry later
            email_queue.enqueue_with_delay(job, delay=30_seconds)

        except Exception as e:
            job["retry_count"] += 1
            if job["retry_count"] < 3:
                email_queue.enqueue_with_delay(job, delay=exponential_backoff(job["retry_count"]))
            else:
                # retries exhausted — move to dead letter queue for manual review
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
            # push failures are lower severity than email — log and continue
            update_db_status(job["job_id"], "push_status", "failed")
            log("warn", f"Push failed for student {job['student_id']}: {e}")


# --- helper for retry delays ---
function exponential_backoff(retry_count):
    return (2 ** retry_count) * 1000  # 2s, 4s, 8s
```

The key idea is separating the concerns: the DB insert is a single atomic batch operation, and the email/push delivery happens asynchronously through job queues. Each job carries a unique ID so we can track delivery status per-student. If a worker crashes, jobs stay in the queue and get picked up by another worker. Failed jobs go to a dead letter queue for manual inspection rather than being lost silently.

| Aspect | Original | Redesigned |
|--------|----------|------------|
| DB writes | 50,000 individual INSERTs | 1 bulk INSERT |
| Email dispatch | Sequential, blocking | Async via job queue |
| Error handling | None | Per-job retry with exponential backoff |
| Failure recovery | Restart from scratch | Dead letter queue + per-student status |
| Idempotency | None | job_id-based deduplication |
| Horizontal scaling | Single process only | Multiple worker instances |
| Estimated time | ~83 minutes | DB: ~2s, emails: ~5min with 10 workers |

**References**: "Designing Data-Intensive Applications" by Martin Kleppmann, Chapter 11 (stream processing and exactly-once semantics); AWS SQS [dead letter queue documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html).

---

## Stage 6 — Priority Inbox Implementation

### Scoring Approach

To rank notifications by importance, I used a weighted formula that combines **type importance** with **recency**:

```
priorityScore = typeWeight × recencyFactor
```

The type weights reflect the practical importance of each category in a campus setting — placement notifications are the most time-sensitive (application deadlines), followed by results, and then general events:

| Type | Weight | Reasoning |
|------|--------|-----------|
| Placement | 3.0 | Time-critical, directly affects career outcomes |
| Result | 2.0 | Important but usually not as urgent as placements |
| Event | 1.0 | Good to know, but missing one is not critical |

The recency factor uses a decay function that gives higher scores to newer notifications:

```
recencyFactor = 1 / (1 + hoursElapsed × 0.1)
```

I picked this formula because it produces a smooth curve: a notification from 1 hour ago scores ~0.91, from 10 hours ago ~0.50, from 24 hours ago ~0.29. The 0.1 coefficient was tuned through trial and error — values higher than 0.1 caused notifications to drop off too quickly, and lower values did not differentiate enough between recent and old items.

### Data Structure Choice — Min-Heap for Top-N

To efficiently extract the top 10 notifications without sorting the entire list, I used a **min-heap** of fixed capacity N. The approach works as follows:

1. Initialize an empty min-heap with capacity N (in our case, 10).
2. The heap is ordered by `priorityScore`, so the root is always the *lowest*-scored item in the current top-N.
3. For each incoming notification, compute its priority score.
4. If the heap is not yet full (fewer than N items), insert directly.
5. If the heap is full and the new score exceeds the root's score, replace the root and re-heapify (the old root was the weakest item and deserves to be evicted).
6. If the new score is lower than the root, skip it — it cannot be in the top N.

Each insertion costs **O(log N)**, and since N is small (10-20), this is effectively O(1) per notification. The alternative — collecting all notifications and sorting them — would be O(M log M) where M could be hundreds or thousands. For our use case, the heap approach is significantly faster.

**Reference**: CLRS, "Introduction to Algorithms" — Chapter 6 on Heapsort and priority queues.

### Implementation

The standalone script is at `stage6_priority_inbox.js` in the repository root. It authenticates with the evaluation service, fetches all available notifications across multiple pages, computes priority scores, and extracts the top 10 using the min-heap.

Output screenshot: `stage6_output.png`

The same priority logic is reused in `notification_app_be/src/priority.js` and served via the backend API at `GET /api/notifications/priority?n=10`.
