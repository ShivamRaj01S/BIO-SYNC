import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@blooddonor.local';
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const existing = await User.findOne({ email: adminEmail, role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', adminEmail);
    process.exit(0);
    return;
  }
  await User.create({
    email: adminEmail,
    name: 'System Admin',
    role: 'admin',
    status: 'active',
    verified: true,
    availabilityStatus: 'inactive',
  });
  console.log('Admin user created:', adminEmail);
  console.log('Log in with Google using this email to access the admin dashboard.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
