import {
  Card, CardContent, Typography, Chip, Box, IconButton, Tooltip
} from "@mui/material";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import WorkIcon from "@mui/icons-material/Work";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AssignmentIcon from "@mui/icons-material/Assignment";
import VisibilityIcon from "@mui/icons-material/Visibility";

const TYPE_CONFIG = {
  Placement: { color: "#7c4dff", icon: <WorkIcon />, label: "Placement" },
  Event: { color: "#ff9100", icon: <EmojiEventsIcon />, label: "Event" },
  Result: { color: "#00e676", icon: <AssignmentIcon />, label: "Result" },
};

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationCard({ notification, isNew, onMarkViewed, showScore }) {
  const config = TYPE_CONFIG[notification.Type] || TYPE_CONFIG.Event;

  return (
    <Card
      sx={{
        mb: 1.5,
        transition: "all 0.2s ease",
        position: "relative",
        borderLeft: `4px solid ${config.color}`,
        background: isNew
          ? "linear-gradient(135deg, rgba(124,77,255,0.08) 0%, rgba(0,229,255,0.05) 100%)"
          : "rgba(17, 24, 39, 0.6)",
        "&:hover": {
          transform: "translateX(4px)",
          boxShadow: `0 4px 20px rgba(124, 77, 255, 0.15)`,
          borderColor: config.color,
        },
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ color: config.color, display: "flex", alignItems: "center" }}>
            {config.icon}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
              <Chip
                label={config.label}
                size="small"
                sx={{
                  bgcolor: `${config.color}22`,
                  color: config.color,
                  fontSize: "0.7rem",
                  height: 22,
                }}
              />
              {isNew && (
                <FiberNewIcon sx={{ color: "#ff1744", fontSize: 20 }} />
              )}
              {showScore && notification.priorityScore != null && (
                <Chip
                  label={`Score: ${notification.priorityScore.toFixed(2)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", height: 20, color: "#00e5ff", borderColor: "#00e5ff44" }}
                />
              )}
            </Box>

            <Typography variant="body2" sx={{ color: "#e2e8f0", fontWeight: 500 }}>
              {notification.Message}
            </Typography>

            <Typography variant="caption" sx={{ color: "#64748b" }}>
              {formatTime(notification.Timestamp)}
            </Typography>
          </Box>

          {isNew && onMarkViewed && (
            <Tooltip title="Mark as viewed">
              <IconButton
                size="small"
                onClick={() => onMarkViewed(notification.ID)}
                sx={{ color: "#64748b", "&:hover": { color: "#7c4dff" } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
