# Campus Notification Platform

A full-stack notification system for real-time campus updates — placements, events, and results.

## Project Structure

```
├── logging_middleware/      # Reusable logging package (npm)
├── notification_app_be/     # Express.js backend API
├── notification_app_fe/     # Next.js frontend application
└── notification_system_design.md
```

## Quick Start

### Logging Middleware
```bash
cd logging_middleware && npm install && npm run build
```

### Backend
```bash
cd notification_app_be && npm install && npm run dev
```

### Frontend
```bash
cd notification_app_fe && npm install && npm run dev
```
Frontend runs at `http://localhost:3000`

## Tech Stack
- **Logging**: TypeScript, reusable npm package
- **Backend**: Node.js, Express, MongoDB, TypeScript
- **Frontend**: Next.js 14, React, Material UI, TypeScript
- **Database**: MongoDB (for caching and read-tracking)
