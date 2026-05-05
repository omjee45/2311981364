const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];

const BACKEND_PACKAGES = [
  "cache", "controller", "cron_job", "db", "domain",
  "handler", "repository", "route", "service"
];

const FRONTEND_PACKAGES = [
  "api", "component", "hook", "page", "state", "style"
];

const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];

function isValidStack(val) {
  return VALID_STACKS.includes(val);
}

function isValidLevel(val) {
  return VALID_LEVELS.includes(val);
}

function isValidPackage(stack, pkg) {
  if (SHARED_PACKAGES.includes(pkg)) return true;
  if (stack === "backend" && BACKEND_PACKAGES.includes(pkg)) return true;
  if (stack === "frontend" && FRONTEND_PACKAGES.includes(pkg)) return true;
  return false;
}

module.exports = { isValidStack, isValidLevel, isValidPackage };
