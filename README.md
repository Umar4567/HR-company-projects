# HR Company Projects

This repository contains a small HR attendance application with a Node/Express backend and a React frontend.

Folders
- `hr-app-backend/` — Express + Mongoose backend
- `hr-app-frontend/` — React frontend (Create React App)

Quick start (development)

1. Backend

```powershell
cd hr-app-backend
npm install
# create a .env with the needed variables (MONGODB_URI, JWT_SECRET, etc.)
npm run dev
```

2. Frontend

```powershell
cd hr-app-frontend
npm install
npm start
```

Testing & CI
- The project includes a basic GitHub Actions workflow that installs dependencies for both frontend and backend and runs `npm test` if available.

Notes
- The backend connects to MongoDB — set `MONGODB_URI` in `hr-app-backend/.env` before starting.
- For production builds, run `npm run build` inside `hr-app-frontend` and serve the `build/` output from the backend or a static host.

If you want me to add step-by-step environment examples or a Postgres migration script, tell me which DB and I’ll add it.
