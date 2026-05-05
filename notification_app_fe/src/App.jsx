import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";
import Navbar from "./components/Navbar";
import AllNotifications from "./pages/AllNotifications";
import PriorityInbox from "./pages/PriorityInbox";
import { useViewedNotifications } from "./hooks/useViewedNotifications";
import { getNotifications } from "./services/api";

function App() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { viewedIds } = useViewedNotifications();

  useEffect(() => {
    getNotifications({ limit: 10 })
      .then((data) => {
        const all = data.notifications || [];
        const unviewed = all.filter((n) => !viewedIds.includes(n.ID));
        setUnreadCount(unviewed.length);
      })
      .catch(() => {});
  }, [viewedIds]);

  return (
    <BrowserRouter>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Navbar unreadCount={unreadCount} />
        <Routes>
          <Route path="/" element={<AllNotifications />} />
          <Route path="/priority" element={<PriorityInbox />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
