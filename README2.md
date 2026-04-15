# Automated E2E Flow Simulation

This repository includes a standalone backend integration simulation that exercises the core emergency donation workflow end-to-end.

## What It Simulates

The script in [backend/src/scripts/simulateFlow.js](/D:/shivamCollege/Shivam6thSem/Project/blood/backend/src/scripts/simulateFlow.js:1) performs this sequence:

1. Creates a simulated admin, hospital, donor, and patient account directly in MongoDB.
2. Verifies that a brand-new hospital can open the dashboard before profile setup and receives a `requiresProfileSetup` response instead of a hard failure.
3. Uses the live backend HTTP endpoints to register the hospital profile and have the admin verify it.
4. Uses the live donor endpoints to save donor blood group and organ details, then toggles donor availability to `available`.
5. Uses the live patient endpoint to create a critical blood request routed to the verified hospital.
6. Verifies that the matching engine creates a notified match for the donor and that the shortlist notification record exists.

Note: Google OAuth is the only part not exercised through `/api/auth/google` because automated local runs cannot mint real Google ID tokens. The simulation bootstraps authenticated users directly and then tests the real business endpoints.

## Command

Run the simulation from the backend folder:

```powershell
cd backend
npm run test:e2e-flow
```

## Requirements

- `backend/.env` must exist and point to a reachable MongoDB database.
- Use a safe local or test Mongo database, because the script writes temporary records.
- By default the script cleans up the users, requests, matches, notifications, and profiles it creates after it finishes.

## Optional

If you want to keep the generated records for inspection, set `E2E_KEEP_DATA=1` before running the command.
