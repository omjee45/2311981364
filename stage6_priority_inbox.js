const { initLogger, Log } = require("./logging_middleware/src/index");

const AUTH_CONFIG = {
  email: "omjee1364.be23@chitkarauniversity.edu.in",
  name: "omjee kumar",
  rollNo: "2311981364",
  accessCode: "EXfvDp",
  clientID: "f24463c7-05a7-4055-92ca-ea6bebcde44e",
  clientSecret: "XSVNpPaHPuYCacJx",
};

const EVAL_URL = "http://20.207.122.201/evaluation-service";

const TYPE_WEIGHTS = {
  Placement: 3.0,
  Result: 2.0,
  Event: 1.0,
};

function computeScore(notification) {
  const typeWeight = TYPE_WEIGHTS[notification.Type] || 1.0;
  const timestamp = new Date(notification.Timestamp).getTime();
  const now = Date.now();
  const hoursElapsed = Math.max(0, (now - timestamp) / (1000 * 60 * 60));
  const recencyFactor = 1 / (1 + hoursElapsed * 0.1);
  return typeWeight * recencyFactor;
}

class MinHeap {
  constructor(capacity) {
    this.capacity = capacity;
    this.heap = [];
  }

  push(item) {
    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    } else if (item.priorityScore > this.heap[0].priorityScore) {
      this.heap[0] = item;
      this._sinkDown(0);
    }
  }

  toSortedArray() {
    return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].priorityScore > this.heap[idx].priorityScore) {
        [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
        idx = parent;
      } else break;
    }
  }

  _sinkDown(idx) {
    const len = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < len && this.heap[left].priorityScore < this.heap[smallest].priorityScore) smallest = left;
      if (right < len && this.heap[right].priorityScore < this.heap[smallest].priorityScore) smallest = right;
      if (smallest !== idx) {
        [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
        idx = smallest;
      } else break;
    }
  }
}

async function getAuthToken() {
  const res = await fetch(`${EVAL_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(AUTH_CONFIG),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchAllNotifications(token) {
  let all = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${EVAL_URL}/notifications?page=${page}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const batch = data.notifications || [];
    all = all.concat(batch);
    if (batch.length < 10) break;
  }
  return all;
}

async function main() {
  initLogger({ ...AUTH_CONFIG, baseUrl: EVAL_URL });

  await Log("backend", "info", "service", "Priority inbox script started").catch(() => {});

  console.log("Fetching auth token...");
  const token = await getAuthToken();

  console.log("Fetching notifications from API...");
  const notifications = await fetchAllNotifications(token);
  console.log(`Fetched ${notifications.length} total notifications\n`);

  await Log("backend", "info", "service", `Fetched ${notifications.length} notifications`).catch(() => {});

  const N = 10;
  const heap = new MinHeap(N);

  for (const notif of notifications) {
    heap.push({
      ...notif,
      priorityScore: computeScore(notif),
    });
  }

  const top10 = heap.toSortedArray();

  console.log("=".repeat(80));
  console.log(`  TOP ${N} PRIORITY NOTIFICATIONS (by weight x recency)`);
  console.log("=".repeat(80));
  console.log("");

  top10.forEach((n, i) => {
    const rank = String(i + 1).padStart(2, " ");
    const score = n.priorityScore.toFixed(4);
    const type = n.Type.padEnd(10);
    console.log(`  #${rank}  [${type}]  Score: ${score}  |  ${n.Message}`);
    console.log(`        ID: ${n.ID}`);
    console.log(`        Time: ${n.Timestamp}`);
    console.log("");
  });

  console.log("=".repeat(80));
  console.log(`  Weight mapping: Placement=3.0, Result=2.0, Event=1.0`);
  console.log(`  Recency formula: 1 / (1 + hoursElapsed * 0.1)`);
  console.log("=".repeat(80));

  await Log("backend", "info", "service", "Priority inbox script done").catch(() => {});
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
