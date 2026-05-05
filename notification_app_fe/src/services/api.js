const API_BASE = "/api";

export async function getNotifications({ page = 1, limit = 10, type = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (type) params.set("notification_type", type);

  const res = await fetch(`${API_BASE}/notifications?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  return res.json();
}

export async function getPriorityNotifications(n = 10) {
  const res = await fetch(`${API_BASE}/notifications/priority?n=${n}`);
  if (!res.ok) throw new Error(`Failed to fetch priority notifications: ${res.status}`);
  return res.json();
}
