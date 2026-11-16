const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables from server/.env in local dev (no-op on Vercel where env vars are injected)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const connectDB = require('./src/config/db');
const seedDepartments = require('./src/config/seedDepartments');

// ─── CORS Configuration (Supports Same-Domain Vercel + Local Dev) ─────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Same-origin browser requests and server-to-server requests often omit origin or match allowed origins
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ─── App Setup ────────────────────────────────────────────────
const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ─── Serverless-Safe Database Initialization Middleware ───────
let isSeeded = false;
const ensureDatabaseConnected = async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    if (!isSeeded && mongoose.connection.readyState === 1) {
      isSeeded = true;
      seedDepartments().catch((err) => console.error('Seed warning:', err.message));
    }
    next();
  } catch (error) {
    console.error('[DB Middleware Error]', error.message);
    return res.status(503).json({
      message: 'Database connection unavailable. Please verify MONGO_URI in environment settings.',
    });
  }
};

app.use('/api', ensureDatabaseConnected);

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth',          require('./src/routes/authRoutes'));
app.use('/api/complaints',    require('./src/routes/complaintRoutes'));
app.use('/api/admin',         require('./src/routes/adminRoutes'));
app.use('/api/officer',       require('./src/routes/officerRoutes'));
app.use('/api/comments',      require('./src/routes/commentRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  if (mongoose.connection.readyState !== 1 && process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (e) {}
  }
  res.json({
    status: 'ok',
    message: 'CivicResolver API is running',
    environment: process.env.NODE_ENV || 'development',
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    hasMongoURI: !!process.env.MONGO_URI,
    hasJWTSecret: !!process.env.JWT_SECRET,
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
  });
});

// ─── Start Server (Local Development) ─────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('🚀 CivicResolver Server running on port ' + PORT);

    if (!process.env.MONGO_URI) {
      console.error('⚠ MONGO_URI is not set! Configure it in server/.env');
    }
    if (!process.env.JWT_SECRET) {
      console.error('⚠ JWT_SECRET is not set! Configure it in server/.env');
    }

    if (process.env.MONGO_URI) {
      connectDB()
        .then(() => {
          isSeeded = true;
          return seedDepartments();
        })
        .catch((err) => console.error('MongoDB setup error:', err.message));
    }
  });
}

module.exports = app;
