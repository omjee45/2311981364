const DEFAULT_BASE_URL = "http://20.207.122.201/evaluation-service";

let _accessToken = null;
let _tokenExpiry = 0;

async function getAuthToken(config) {
  const now = Math.floor(Date.now() / 1000);

  if (_accessToken && _tokenExpiry > now + 60) {
    return _accessToken;
  }

  const url = (config.baseUrl || DEFAULT_BASE_URL) + "/auth";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: config.email,
      name: config.name,
      rollNo: config.rollNo,
      accessCode: config.accessCode,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Auth request failed with status ${res.status}`);
  }

  const data = await res.json();
  _accessToken = data.access_token;
  _tokenExpiry = data.expires_in;

  return _accessToken;
}

function clearTokenCache() {
  _accessToken = null;
  _tokenExpiry = 0;
}

module.exports = { getAuthToken, clearTokenCache };
