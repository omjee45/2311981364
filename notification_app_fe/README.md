# Notification App — Frontend

React-based frontend for the campus notification platform.

## Pages

- **/** — All notifications with pagination and type filtering (Placement / Event / Result)
- **/priority** — Priority inbox showing top-N notifications ranked by importance and recency

## Features

- Material UI dark theme
- Type-based filtering (Placement, Event, Result)
- Pagination support
- Priority inbox with adjustable top-N slider (5, 10, 15, 20)
- New vs viewed notification tracking (persisted in localStorage)
- Responsive layout for desktop and mobile

## Running

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. Backend must be running on port 5000.
