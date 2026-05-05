# Notification App — Frontend

React-based frontend for the campus notification platform. Scaffolded with Vite and styled using Material UI's dark theme.

## Pages

- **/** — All notifications with pagination and type filtering (Placement / Event / Result)
- **/priority** — Priority inbox showing top-N notifications ranked by importance and recency

## Features

- Material UI dark theme with custom color palette (purple primary, cyan accent)
- Type-based filtering using toggle buttons
- Pagination (10 items per page, controlled by the backend)
- Priority inbox with adjustable top-N slider (5, 10, 15, 20)
- Client-side viewed/unviewed tracking using localStorage (since the eval API does not support per-user read status)
- Skeleton loading states to avoid layout shift during API calls
- Responsive layout for desktop and mobile

## Architecture

The frontend does not talk to the evaluation service directly. All API calls go through the Express backend running on port 5000. In development, Vite's proxy (configured in `vite.config.js`) forwards `/api/*` requests to the backend automatically.

## Running

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. The backend must be running on port 5000 first.
