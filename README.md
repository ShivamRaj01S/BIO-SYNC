# Blood & Organ Donor Management System - BIO SYNC

Full-stack platform for donors, patients, hospitals, and admins with role-based access, smart donor matching, emergency escalation, reliability scoring, fraud controls, and auditability.

## 🔗 Live Demo & Links

- **Public Deploy Link**: https://bio-sync-s9qt.vercel.app/
- **Local Application Link**: localhost:portno (frontend/backend)
- **GitHub Repository**: https://github.com/ShivamRaj01S/BIO-SYNC

---

## 📸 Screenshots Overview

Here is a visual walk-through of the platform's key features:

<!-- <details>
<summary><b>Click to view full Screenshot Walkthrough</b></summary> -->

### Landing Page
<img src="screenshot/Screenshot 2026-04-19 153753.png" width="800" />

### Register Page
<img src="screenshot/Screenshot 2026-04-19 153823.png" width="800" />

### Role Selection
<img src="screenshot/Screenshot 2026-04-19 153858.png" width="800" />

### Google Oauth
<img src="screenshot/Screenshot 2026-04-19 153937.png" width="800" />

### Hospital Role Dashboard
<img src="screenshot/Screenshot 2026-04-19 154310.png" width="800" />

### Location Ui for visual
<img src="screenshot/Screenshot 2026-04-19 154321.png" width="800" />

### Admin page (verification of hospital)
<img src="screenshot/Screenshot 2026-04-19 154412.png" width="800" />

### Email Notification
<img src="screenshot/Screenshot 2026-04-19 154503.png" width="800" />

### Hospital verified(by admin) email notification
<img src="screenshot/Screenshot 2026-04-19 154516.png" width="800" />

### Verified Hospital eligible for organ request
<img src="screenshot/Screenshot 2026-04-19 154532.png" width="800" />

### BIO SYNC
<img src="screenshot/Screenshot 2026-04-19 154550.png" width="800" />

### BIO SYNC - Role Based 
<img src="screenshot/Screenshot 2026-04-19 154622.png" width="800" />

### Admin Page - Audit Log page
<img src="screenshot/Screenshot 2026-04-19 154646.png" width="800" />

### Admin Page - User Control
<img src="screenshot/Screenshot 2026-04-19 154657.png" width="800" />

### MongoDB - collection -document
<img src="screenshot/Screenshot 2026-04-19 154836.png" width="800" />

### Donor DashBoard
<img src="screenshot/Screenshot 2026-04-19 155519.png" width="800" />

### Patient Dashboard
<img src="screenshot/Screenshot 2026-04-19 155805.png" width="800" />

### Notification Dashboard for users
<img src="screenshot/Screenshot 2026-04-19 171733.png" width="800" />

### Live Tracking of Request
<img src="screenshot/Screenshot 2026-04-19 171800.png" width="800" />

### Google Map Ui 
<img src="screenshot/Screenshot 2026-04-19 171812.png" width="800" />

</details>

---

## 🛠️ Tech Stack Overview

- **Frontend**: React, React Router, Axios, Tailwind-powered CSS UI, Vite
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT, Google OAuth
- **Runtime services**: Background workers, audit logs, rate limiting, fraud detection, in-app notifications, optional email notifications

## 🏗️ Architecture Summary

This codebase now follows an ISA-style layered structure:

- `models/` for persistence contracts
- `controllers/` for request orchestration
- `services/` for business logic such as matching, fraud review, profile sync, notifications, and reliability scoring
- `middleware/` for auth, rate limiting, request context, and error handling
- `jobs/` for request escalation and donor availability reset workers
- `routes/` for thin HTTP entry points

## 👥 Core Role Rules

- **Donor**: Maintains blood group, organ preferences, location, availability, and trust score
- **Patient**: Can create blood-only requests
- **Hospital**: Can create organ requests only after verification
- **Admin**: Verifies hospitals, reviews audit trails, blocks users, and monitors fraud flags

## 🔑 Environment Variables Required

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

## 🚀 Local Setup Guide



```powershell
cd backend
copy .env.example .env
npm install
npm run seed:admin
npm run dev
```



```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```



```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

The backend runs background workers automatically on server startup for:

- request escalation
- donor availability reset after the medical waiting period
- legacy donor and hospital profile sync into the richer `User` schema

## 🔄 System Flow

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

## 🧠 Matching Engine Summary

For each pending request, the backend:

1. filters donors by blood compatibility, organ preference compatibility, waiting period, account status, and geo-radius
2. ranks eligible donors using urgency, distance, reliability score, and availability status
3. notifies only the top-ranked batch first
4. escalates automatically if nobody accepts within the configured response window
5. stops all further escalation as soon as one donor accepts

## 🛡️ Security and Abuse Controls

- JWT authentication with role-aware route protection
- verified-hospital enforcement for organ request creation
- patient-only blood request enforcement
- request creation rate limiting
- duplicate-account detection using identity, phone, and hospital registration signals
- location mismatch flagging using client or proxy-provided coordinates
- admin security overview for flagged and blocked users
- audit trail for registration, hospital verification, matching, reliability changes, and status updates

## 📊 Dashboard Coverage

- Donor dashboard: incoming requests, availability toggle, organ preferences, trust score, notifications
- Patient dashboard: blood request creation and live request tracking
- Hospital dashboard: verification profile workflow, organ request creation, matched donor list, donation completion confirmation
- Admin dashboard: hospital verification queue, user blocking controls, fraud review, audit logs

## 📁 Project Structure

```text
blood/
+- backend/
|  +- src/
|  |  +- config/
|  |  +- controllers/
|  |  +- jobs/
|  |  +- middleware/
|  |  +- models/
|  |  +- routes/
|  |  +- services/
|  |  +- utils/
|  |  +- app.js
|  |  +- server.js
|  +- package.json
+- frontend/
|  +- src/
|  |  +- api/
|  |  +- components/
|  |  +- context/
|  |  +- pages/
|  |  +- App.jsx
|  |  +- main.jsx
|  +- package.json
+- README.md
```

## 📝 Notes

- The frontend stores the JWT in local storage for development convenience. Use secure cookies and HTTPS for production hardening.
- `MAPS_API_KEY` is optional because donor search currently uses MongoDB geospatial queries. Keep the variable if you later add reverse geocoding or route-distance services.
- If you are upgrading from the older profile-based version, the server syncs legacy donor and hospital profile data into the expanded `User` schema on startup.

