# Campus Notification System

A full-stack campus notification app for Placements, Events, and Results. 

## Structure
- `logging_middleware/`: local npm package for the logging API
- `notification_app_be/`: Express backend (port 5000)
- `notification_app_fe/`: React frontend (port 3000)
- `stage6_priority_inbox.js`: Priority inbox CLI script
- `notification_system_design.md`: Design docs

## Setup

1. **Logging Middleware**
```bash
cd logging_middleware
npm test
```

2. **Backend**
```bash
cd notification_app_be
npm install
npm run dev
```

3. **Frontend**
```bash
cd notification_app_fe
npm install
npm run dev
```

## Stack
- Node.js, Express, React, Vite
- SSE for real-time updates
- Min-Heap algorithm for priority ranking
