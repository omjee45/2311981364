import { AppBar, Toolbar, Typography, Button, Badge, Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
import StarIcon from "@mui/icons-material/Star";

export default function Navbar({ unreadCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar
      position="sticky"
      sx={{
        background: "linear-gradient(135deg, #0a0e1a 0%, #1a1040 100%)",
        borderBottom: "1px solid rgba(124, 77, 255, 0.2)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            cursor: "pointer",
            background: "linear-gradient(90deg, #7c4dff, #00e5ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
          onClick={() => navigate("/")}
        >
          CampusNotify
        </Typography>

        <Button
          startIcon={
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon />
            </Badge>
          }
          sx={{
            color: isActive("/") ? "#7c4dff" : "#94a3b8",
            fontWeight: isActive("/") ? 700 : 400,
            "&:hover": { color: "#7c4dff" },
          }}
          onClick={() => navigate("/")}
        >
          All
        </Button>

        <Button
          startIcon={<StarIcon />}
          sx={{
            color: isActive("/priority") ? "#00e5ff" : "#94a3b8",
            fontWeight: isActive("/priority") ? 700 : 400,
            "&:hover": { color: "#00e5ff" },
          }}
          onClick={() => navigate("/priority")}
        >
          Priority
        </Button>
      </Toolbar>
    </AppBar>
  );
}
