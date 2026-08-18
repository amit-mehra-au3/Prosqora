const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const emailRoutes = require('./routes/email');
const adminRoutes = require('./routes/admin');
const billingRoutes = require('./routes/billing');
const superAdminRoutes = require('./routes/superAdmin');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable trust proxy for Render / HTTPS load balancers
app.set('trust proxy', 1);

// Production CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN || process.env.APP_URL;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback for dynamic Render domain aliases
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach Auth, Super Admin, CRM API, Email Outreach, Admin Panel & Billing Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api', apiRoutes);
app.use('/api', emailRoutes);

// Production Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Prosqora',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// Serve compiled React SPA production build in production or when client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Initialize database and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`================================================`);
      console.log(`Prosqora SaaS Backend Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log(`================================================`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
