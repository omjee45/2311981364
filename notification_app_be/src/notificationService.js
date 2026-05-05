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

  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.notification_type) query.set("notification_type", params.notification_type);

  const qs = query.toString();
  const url = `${config.evalServiceUrl}/notifications${qs ? "?" + qs : ""}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Eval service returned ${resp.status}: ${errText}`);
  }

  return resp.json();
}

module.exports = { fetchNotifications, getEvalToken };
