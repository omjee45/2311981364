const { initLogger, Log } = require("./logging_middleware/src/index");
const { computeScore, MinHeap } = require("./notification_app_be/src/priority");

const AUTH_CONFIG = {
  email: "omjee1364.be23@chitkarauniversity.edu.in",
  name: "omjee kumar",
  rollNo: "2311981364",
  accessCode: "EXfvDp",
  clientID: "f24463c7-05a7-4055-92ca-ea6bebcde44e",
  clientSecret: "XSVNpPaHPuYCacJx",
};

const EVAL_URL = "http://20.207.122.201/evaluation-service";

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
