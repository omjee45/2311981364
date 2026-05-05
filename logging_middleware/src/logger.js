const { getAuthToken } = require("./auth");
const { isValidStack, isValidLevel, isValidPackage } = require("./validators");

const DEFAULT_BASE_URL = "http://20.207.122.201/evaluation-service";

let _config = null;

function initLogger(config) {
  if (!config.clientID || !config.clientSecret) {
    throw new Error("clientID and clientSecret are required");
  }
  _config = { ...config };
}

async function Log(stack, level, pkg, message) {
  if (!_config) {
    throw new Error("Logger not initialised. Call initLogger(config) first.");
  }

  if (!isValidStack(stack)) {
    throw new Error(`Invalid stack: "${stack}". Must be "backend" or "frontend".`);
  }
  if (!isValidLevel(level)) {
    throw new Error(`Invalid level: "${level}". Allowed: debug, info, warn, error, fatal.`);
  }
  if (!isValidPackage(stack, pkg)) {
    throw new Error(`Invalid package: "${pkg}" not allowed for stack "${stack}".`);
  }
  if (!message || message.trim().length === 0) {
    throw new Error("Log message cannot be empty.");
  }

  const token = await getAuthToken(_config);
  const url = (_config.baseUrl || DEFAULT_BASE_URL) + "/logs";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stack, level, package: pkg, message }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "unknown error");
    throw new Error(`Log API returned ${res.status}: ${errBody}`);
  }

  return res.json();
}

module.exports = { initLogger, Log };
