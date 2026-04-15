import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donor.js';
import patientRoutes from './routes/patient.js';
import hospitalRoutes from './routes/hospital.js';
import adminRoutes from './routes/admin.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { attachRequestContext } from './middleware/requestContext.js';
import { apiLimiter } from './middleware/rateLimiters.js';

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(attachRequestContext);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
