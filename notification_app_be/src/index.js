const express = require("express");
const cors = require("cors");
const { initLogger, Log } = require("logging-middleware");
const config = require("./config");
const { fetchNotifications, fetchAllNotifications } = require("./notificationService");
const { getTopNPriority } = require("./priority");

const app = express();
app.use(cors());
app.use(express.json());

initLogger({
  email: config.auth.email,
  name: config.auth.name,
  rollNo: config.auth.rollNo,
  accessCode: config.auth.accessCode,
  clientID: config.auth.clientID,
  clientSecret: config.auth.clientSecret,
  baseUrl: config.evalServiceUrl,
});

function safeLog(stack, level, pkg, msg) {
  const trimmed = msg.length > 48 ? msg.substring(0, 45) + "..." : msg;
  return Log(stack, level, pkg, trimmed).catch(() => {});
}

app.use(async (req, res, next) => {
  const start = Date.now();
  res.on("finish", async () => {
    const duration = Date.now() - start;
    safeLog("backend", res.statusCode >= 400 ? "error" : "info", "middleware",
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

app.get("/api/notifications", async (req, res) => {
  try {
    const { page, limit, notification_type } = req.query;

    safeLog("backend", "info", "controller", `GET notifs p=${page || 1} t=${notification_type || "all"}`);

    const data = await fetchNotifications({
      page: page || 1,
      limit: limit || 10,
      notification_type: notification_type || undefined,
    });

    safeLog("backend", "debug", "controller", `Fetched ${data.notifications?.length || 0} notifs`);

    res.json(data);
  } catch (err) {
    safeLog("backend", "error", "controller", `Notif fetch failed: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch notifications", details: err.message });
  }
});

app.get("/api/notifications/priority", async (req, res) => {
  try {
    const n = parseInt(req.query.n) || 10;

    safeLog("backend", "info", "controller", `Priority inbox top ${n}`);

    const allNotifications = await fetchAllNotifications();

    if (allNotifications.length === 0) {
      safeLog("backend", "warn", "controller", "No notifs for priority calc");
      return res.json({ priorityNotifications: [], count: 0 });
    }

    const prioritized = getTopNPriority(allNotifications, n);

    safeLog("backend", "info", "service", `Priority done: ${prioritized.length} items`);

    res.json({
      priorityNotifications: prioritized,
      count: prioritized.length,
    });
  } catch (err) {
    safeLog("backend", "error", "controller", `Priority failed: ${err.message}`);
    res.status(500).json({ error: "Failed to compute priority inbox", details: err.message });
  }
});

app.get("/api/notifications/stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  safeLog("backend", "info", "route", "SSE client connected");

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ status: "alive", timestamp: new Date().toISOString() })}\n\n`);
  }, 15000);

  let lastTimestamp = null;
  const poller = setInterval(async () => {
    try {
      const data = await fetchNotifications({ limit: 10 });
      const notifications = data.notifications || [];

      if (notifications.length > 0) {
        const newest = notifications[0].Timestamp;
        if (newest !== lastTimestamp) {
          lastTimestamp = newest;
          for (const notif of notifications) {
            res.write(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`);
          }
        }
      }
    } catch (err) {}
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(poller);
    safeLog("backend", "info", "route", "SSE client disconnected");
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(config.port, async () => {
  console.log(`Backend running on http://localhost:${config.port}`);
  safeLog("backend", "info", "config", `Server started on port ${config.port}`);
});
