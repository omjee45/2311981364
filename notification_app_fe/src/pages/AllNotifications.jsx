import { useState, useEffect } from "react";
import {
  Box, Typography, ToggleButtonGroup, ToggleButton, Pagination,
  CircularProgress, Alert, Button, Skeleton
} from "@mui/material";
import NotificationCard from "../components/NotificationCard";
import { getNotifications } from "../services/api";
import { useViewedNotifications } from "../hooks/useViewedNotifications";

const TYPES = ["All", "Placement", "Result", "Event"];

export default function AllNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("All");
  const { isViewed, markAsViewed, markManyAsViewed } = useViewedNotifications();

  const limit = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const type = typeFilter === "All" ? "" : typeFilter;

    getNotifications({ page, limit, type })
      .then((data) => {
        if (!cancelled) {
          setNotifications(data.notifications || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [page, typeFilter]);

  const handleTypeChange = (e, val) => {
    if (val !== null) {
      setTypeFilter(val);
      setPage(1);
    }
  };

  const unviewedIds = notifications
    .filter((n) => !isViewed(n.ID))
    .map((n) => n.ID);

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Notifications
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
        Stay updated with campus placements, events, and results
      </Typography>

      <Box sx={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        gap: 2, mb: 3, justifyContent: "space-between"
      }}>
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={handleTypeChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              color: "#94a3b8",
              borderColor: "rgba(124,77,255,0.2)",
              fontSize: "0.8rem",
              px: 2,
              "&.Mui-selected": {
                bgcolor: "rgba(124,77,255,0.15)",
                color: "#7c4dff",
                "&:hover": { bgcolor: "rgba(124,77,255,0.25)" },
              },
            },
          }}
        >
          {TYPES.map((t) => (
            <ToggleButton key={t} value={t}>{t}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        {unviewedIds.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => markManyAsViewed(unviewedIds)}
            sx={{ borderColor: "#7c4dff44", color: "#7c4dff", fontSize: "0.75rem" }}
          >
            Mark all as viewed ({unviewedIds.length})
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={80}
            sx={{ mb: 1.5, bgcolor: "rgba(124,77,255,0.05)" }}
          />
        ))
      ) : notifications.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "#64748b", mt: 6 }}>
          No notifications found
        </Typography>
      ) : (
        notifications.map((n) => (
          <NotificationCard
            key={n.ID}
            notification={n}
            isNew={!isViewed(n.ID)}
            onMarkViewed={markAsViewed}
          />
        ))
      )}

      {!loading && notifications.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={10}
            page={page}
            onChange={(e, val) => setPage(val)}
            sx={{
              "& .MuiPaginationItem-root": {
                color: "#94a3b8",
                "&.Mui-selected": {
                  bgcolor: "rgba(124,77,255,0.2)",
                  color: "#7c4dff",
                },
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
