import { useState, useEffect } from "react";
import {
  Box, Typography, Slider, CircularProgress, Alert, Chip,
  ToggleButtonGroup, ToggleButton, Skeleton
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import NotificationCard from "../components/NotificationCard";
import { getPriorityNotifications } from "../services/api";
import { useViewedNotifications } from "../hooks/useViewedNotifications";

const TYPES = ["All", "Placement", "Result", "Event"];

export default function PriorityInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topN, setTopN] = useState(10);
  const [typeFilter, setTypeFilter] = useState("All");
  const { isViewed, markAsViewed } = useViewedNotifications();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPriorityNotifications(topN)
      .then((data) => {
        if (!cancelled) {
          setNotifications(data.priorityNotifications || []);
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
  }, [topN]);

  const filtered = typeFilter === "All"
    ? notifications
    : notifications.filter((n) => n.Type === typeFilter);

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <StarIcon sx={{ color: "#00e5ff" }} />
        <Typography variant="h4">Priority Inbox</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
        Top notifications ranked by importance and recency
      </Typography>

      <Box sx={{
        bgcolor: "rgba(0,229,255,0.05)",
        border: "1px solid rgba(0,229,255,0.15)",
        borderRadius: 2,
        p: 2.5,
        mb: 3,
      }}>
        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1.5 }}>
          Show top <Chip label={topN} size="small" sx={{ mx: 0.5, bgcolor: "#00e5ff22", color: "#00e5ff" }} /> notifications
        </Typography>
        <Slider
          value={topN}
          onChange={(e, val) => setTopN(val)}
          min={5}
          max={20}
          step={5}
          marks={[
            { value: 5, label: "5" },
            { value: 10, label: "10" },
            { value: 15, label: "15" },
            { value: 20, label: "20" },
          ]}
          sx={{
            color: "#00e5ff",
            "& .MuiSlider-markLabel": { color: "#64748b", fontSize: "0.75rem" },
          }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={(e, val) => { if (val) setTypeFilter(val); }}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              color: "#94a3b8",
              borderColor: "rgba(0,229,255,0.2)",
              fontSize: "0.8rem",
              px: 2,
              "&.Mui-selected": {
                bgcolor: "rgba(0,229,255,0.12)",
                color: "#00e5ff",
                "&:hover": { bgcolor: "rgba(0,229,255,0.2)" },
              },
            },
          }}
        >
          {TYPES.map((t) => (
            <ToggleButton key={t} value={t}>{t}</ToggleButton>
          ))}
        </ToggleButtonGroup>
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
            sx={{ mb: 1.5, bgcolor: "rgba(0,229,255,0.05)" }}
          />
        ))
      ) : filtered.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "#64748b", mt: 6 }}>
          No priority notifications found
        </Typography>
      ) : (
        filtered.map((n, idx) => (
          <Box key={n.ID} sx={{ position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                left: -28,
                top: "50%",
                transform: "translateY(-50%)",
                width: 22,
                height: 22,
                borderRadius: "50%",
                bgcolor: idx < 3 ? "#7c4dff" : "#1e293b",
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: idx < 3 ? "#fff" : "#64748b",
              }}
            >
              {idx + 1}
            </Box>
            <NotificationCard
              notification={n}
              isNew={!isViewed(n.ID)}
              onMarkViewed={markAsViewed}
              showScore
            />
          </Box>
        ))
      )}
    </Box>
  );
}
