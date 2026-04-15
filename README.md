# Blood & Organ Donor Management System

Placement-ready full-stack platform for donors, patients, hospitals, and admins with role-based access, smart donor matching, emergency escalation, reliability scoring, fraud controls, and auditability.

## Tech Stack Overview

- Frontend: React, React Router, Axios, Tailwind-powered CSS UI, Vite
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, Google OAuth
- Runtime services: Background workers, audit logs, rate limiting, fraud detection, in-app notifications, optional email notifications

## Architecture Summary

This codebase now follows an ISA-style layered structure:

- `models/` for persistence contracts
- `controllers/` for request orchestration
- `services/` for business logic such as matching, fraud review, profile sync, notifications, and reliability scoring
- `middleware/` for auth, rate limiting, request context, and error handling
- `jobs/` for request escalation and donor availability reset workers
- `routes/` for thin HTTP entry points

## Core Role Rules

- Donor: Maintains blood group, organ preferences, location, availability, and trust score
- Patient: Can create blood-only requests
- Hospital: Can create organ requests only after verification
- Admin: Verifies hospitals, reviews audit trails, blocks users, and monitors fraud flags

## Environment Variables Required

### Backend

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | API port, default `5000` |
| `FRONTEND_URL` | Yes | Allowed frontend origin for CORS and email links |
| `MONGO_URI` | Yes | Primary MongoDB connection string |
| `MONGODB_URI` | No | Backward-compatible MongoDB fallback |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRE` | No | JWT expiry window, default `7d` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret if needed by your setup |
| `EMAIL_USER` | No | SMTP sender account |
| `EMAIL_PASS` | No | SMTP sender password or app password |
| `EMAIL_FROM` | No | Custom sender label |
| `ADMIN_EMAIL` | Yes | Email used by `seed:admin` |
| `MAPS_API_KEY` | No | Optional external maps or geocoding integration key |
| `INITIAL_RADIUS_KM` | No | Initial donor search radius |
| `MAX_RADIUS_KM` | No | Maximum escalation radius |
| `ESCALATION_RADIUS_STEP_KM` | No | Radius increase per escalation cycle |
| `TOP_DONORS_TO_NOTIFY` | No | Initial donor notification batch size |
| `RESPONSE_TIMEOUT_MINUTES` | No | Standard donor response timeout |
| `CRITICAL_RESPONSE_TIMEOUT_MINUTES` | No | Critical-case donor response timeout |
| `CRITICAL_ESCALATION_BATCH_SIZE` | No | Critical-case donor notification batch size |
| `BLOOD_WAITING_PERIOD_DAYS` | No | Blood donation medical cooling period |
| `ORGAN_WAITING_PERIOD_DAYS` | No | Organ donation recovery window used by the worker |
| `REQUEST_CREATION_RATE_LIMIT_MAX` | No | Request creation anti-spam threshold |
| `AUTH_RATE_LIMIT_MAX` | No | Auth endpoint rate limit |
| `API_RATE_LIMIT_MAX` | No | Global API rate limit |
| `LOCATION_MISMATCH_THRESHOLD_KM` | No | Fraud detection threshold |
| `REQUEST_ESCALATION_INTERVAL_MS` | No | Background escalation worker interval |
| `DONOR_AVAILABILITY_JOB_INTERVAL_MS` | No | Donor reset worker interval |

### Frontend

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | Yes | API base URL, usually `http://localhost:5000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth client id for the React app |

## Local Setup Guide

### 1. Backend terminal

```powershell
cd backend
copy .env.example .env
npm install
npm run seed:admin
npm run dev
```

### 2. Frontend terminal

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

### 3. Open the app

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

The backend runs background workers automatically on server startup for:

- request escalation
- donor availability reset after the medical waiting period
- legacy donor and hospital profile sync into the richer `User` schema

## System Flow

The application follows this exact runtime flow:

1. Request created
2. Eligibility filters applied
3. Donors ranked
4. Notifications sent
5. Donor accepts
6. Hospital confirms
7. Donation recorded
8. Scores updated
9. Dashboards updated

## Matching Engine Summary

For each pending request, the backend:

1. filters donors by blood compatibility, organ preference compatibility, waiting period, account status, and geo-radius
2. ranks eligible donors using urgency, distance, reliability score, and availability status
3. notifies only the top-ranked batch first
4. escalates automatically if nobody accepts within the configured response window
5. stops all further escalation as soon as one donor accepts

## Security and Abuse Controls

- JWT authentication with role-aware route protection
- verified-hospital enforcement for organ request creation
- patient-only blood request enforcement
- request creation rate limiting
- duplicate-account detection using identity, phone, and hospital registration signals
- location mismatch flagging using client or proxy-provided coordinates
- admin security overview for flagged and blocked users
- audit trail for registration, hospital verification, matching, reliability changes, and status updates

## Dashboard Coverage

- Donor dashboard: incoming requests, availability toggle, organ preferences, trust score, notifications
- Patient dashboard: blood request creation and live request tracking
- Hospital dashboard: verification profile workflow, organ request creation, matched donor list, donation completion confirmation
- Admin dashboard: hospital verification queue, user blocking controls, fraud review, audit logs

## Project Structure

```text
blood/
+- backend/
¦  +- src/
¦  ¦  +- config/
¦  ¦  +- controllers/
¦  ¦  +- jobs/
¦  ¦  +- middleware/
¦  ¦  +- models/
¦  ¦  +- routes/
¦  ¦  +- services/
¦  ¦  +- utils/
¦  ¦  +- app.js
¦  ¦  +- server.js
¦  +- package.json
+- frontend/
¦  +- src/
¦  ¦  +- api/
¦  ¦  +- components/
¦  ¦  +- context/
¦  ¦  +- pages/
¦  ¦  +- App.jsx
¦  ¦  +- main.jsx
¦  +- package.json
+- README.md
```

## Notes

- The frontend stores the JWT in local storage for development convenience. Use secure cookies and HTTPS for production hardening.
- `MAPS_API_KEY` is optional because donor search currently uses MongoDB geospatial queries. Keep the variable if you later add reverse geocoding or route-distance services.
- If you are upgrading from the older profile-based version, the server syncs legacy donor and hospital profile data into the expanded `User` schema on startup.
