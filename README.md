# Campus Notification Platform

Full-stack notification system for real-time campus updates — placements, events, and results. Built as part of the notification system design project.

## Project Structure

```
├── logging_middleware/         # Reusable logging package (local npm link)
├── notification_app_be/        # Express.js backend API (port 5000)
├── notification_app_fe/        # React + Vite frontend (port 3000)
├── notification_system_design.md  # System design document (stages 1-6)
├── stage6_priority_inbox.js    # Standalone priority inbox demo script
└── .gitignore
```

## How the Pieces Fit Together

The **logging middleware** is a standalone npm package that wraps the evaluation service's logging API. It handles authentication, token caching, and input validation. The backend links to it as a local dependency (`file:../logging_middleware` in package.json) so both the backend server and the stage 6 script can use the same logging interface.

The **backend** is an Express server that acts as a proxy to the evaluation service — the frontend never talks to the eval API directly. It exposes REST endpoints for listing notifications, fetching the priority inbox, and streaming real-time updates via SSE.

The **frontend** is a React app (scaffolded with Vite) that consumes the backend API. It has two pages: a paginated notification list with type filtering, and a priority inbox that shows the top-N notifications ranked by importance and recency.

The **stage6 script** is a standalone Node.js script that demonstrates the priority inbox algorithm from the command line. It imports the same `MinHeap` and `computeScore` functions from the backend's `priority.js` module to avoid code duplication.

## Setup

### 1. Logging Middleware
```bash
cd logging_middleware
npm test
```

### 2. Backend (runs on port 5000)
```bash
cd notification_app_be
npm install
npm run dev
```

### 3. Frontend (runs on port 3000)
```bash
cd notification_app_fe
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Make sure the backend is running first so the API proxy works.

## Tech Stack
- **Logging**: JavaScript, reusable npm package with token caching
- **Backend**: Node.js, Express.js, dotenv for config
- **Frontend**: React 19, Vite, Material UI (dark theme)
- **Real-time**: Server-Sent Events (SSE)
- **Algorithm**: Min-heap for O(log N) priority inbox extraction
