const config = require("./config");

let _token = null;
let _tokenExpiry = 0;

async function getEvalToken() {
  const now = Math.floor(Date.now() / 1000);

  if (_token && _tokenExpiry > now + 60) {
    return _token;
  }

  const resp = await fetch(`${config.evalServiceUrl}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: config.auth.email,
      name: config.auth.name,
      rollNo: config.auth.rollNo,
      accessCode: config.auth.accessCode,
      clientID: config.auth.clientID,
      clientSecret: config.auth.clientSecret,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Eval service auth failed: ${resp.status}`);
  }

  const data = await resp.json();
  _token = data.access_token;
  _tokenExpiry = data.expires_in;

  return _token;
}

async function fetchNotifications(params = {}) {
  const token = await getEvalToken();

  const limit = Math.min(Math.max(parseInt(params.limit) || 10, 5), 10);
  const page = parseInt(params.page) || 1;

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  if (params.notification_type) query.set("notification_type", params.notification_type);

  const url = `${config.evalServiceUrl}/notifications?${query.toString()}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Eval service returned ${resp.status}: ${errText}`);
  }

  return resp.json();
}

async function fetchAllNotifications(params = {}) {
  const token = await getEvalToken();
  let allNotifications = [];

  for (let page = 1; page <= 10; page++) {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("limit", "10");
    if (params.notification_type) query.set("notification_type", params.notification_type);

    const url = `${config.evalServiceUrl}/notifications?${query.toString()}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) break;

    const data = await resp.json();
    const batch = data.notifications || [];
    allNotifications = allNotifications.concat(batch);

    if (batch.length < 10) break;
  }

  return allNotifications;
}

module.exports = { fetchNotifications, fetchAllNotifications, getEvalToken };
