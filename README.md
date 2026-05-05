# Campus Notification Platform

Full-stack notification system for real-time campus updates — placements, events, and results.

## Project Structure

```
├── logging_middleware/         # Reusable logging package (npm)
├── notification_app_be/        # Express.js backend API
├── notification_app_fe/        # React (Vite) frontend app
├── notification_system_design.md
└── .gitignore
```

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

Open `http://localhost:3000` in your browser. Make sure the backend is running first.

## Tech Stack
- **Logging**: JavaScript, reusable npm package
- **Backend**: Node.js, Express.js
- **Frontend**: React 19, Vite, Material UI
- **Real-time**: Server-Sent Events (SSE)
