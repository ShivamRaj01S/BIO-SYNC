import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { startBackgroundWorkers } from './jobs/backgroundWorkers.js';
import { syncLegacyProfiles } from './services/profileService.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  await syncLegacyProfiles();
  startBackgroundWorkers();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
