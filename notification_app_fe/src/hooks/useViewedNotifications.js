import { useState, useEffect, useCallback } from "react";

const VIEWED_KEY = "viewed_notifications";

function getViewedIds() {
  try {
    return JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveViewedIds(ids) {
  localStorage.setItem(VIEWED_KEY, JSON.stringify(ids));
}

export function useViewedNotifications() {
  const [viewedIds, setViewedIds] = useState(getViewedIds);

  const markAsViewed = useCallback((id) => {
    setViewedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveViewedIds(next);
      return next;
    });
  }, []);

  const markManyAsViewed = useCallback((ids) => {
    setViewedIds((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      const next = Array.from(set);
      saveViewedIds(next);
      return next;
    });
  }, []);

  const isViewed = useCallback(
    (id) => viewedIds.includes(id),
    [viewedIds]
  );

  return { viewedIds, markAsViewed, markManyAsViewed, isViewed };
}
