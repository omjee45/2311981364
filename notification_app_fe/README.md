# Notification Frontend

React frontend for the campus notification app. Uses Vite and Material UI.

## Pages
- `/` - All notifications (with pagination and filters)
- `/priority` - Priority inbox showing top notifications

## Features
- Dark theme
- Filters for Placement, Event, Result
- Slider to change top N notifications
- Client-side viewed tracking using localStorage
- Skeleton loading screens

## Run
Backend must be running on port 5000 first (Vite proxy sends `/api/*` to it).

```bash
npm install
npm run dev
```
