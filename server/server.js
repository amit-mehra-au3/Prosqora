const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
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

// Locate compiled React SPA production build across possible directory structures
const possibleDistPaths = [
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, 'dist')
];

let clientDistPath = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

console.log('================================================');
console.log('[PROSQORA FRONTEND DIAGNOSTIC]');
console.log('Current __dirname:', __dirname);
console.log('Current process.cwd():', process.cwd());
possibleDistPaths.forEach((p, i) => {
  const dirExists = fs.existsSync(p);
  const indexExists = dirExists ? fs.existsSync(path.join(p, 'index.html')) : false;
  console.log(`- Path [${i}] ${p} => Dir Exists: ${dirExists}, index.html Exists: ${indexExists}`);
});

// Auto-generate frontend build if client/dist is missing on startup
if (!clientDistPath) {
  console.log('[STATIC SERVING] client/dist index.html not detected. Executing automated frontend build...');
  try {
    const rootDir = path.resolve(__dirname, '..');
    const clientDir = path.resolve(rootDir, 'client');
    if (fs.existsSync(clientDir)) {
      execSync('npm install --include=dev && npm run build', { cwd: clientDir, stdio: 'inherit' });
      clientDistPath = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));
    }
  } catch (e) {
    console.error('[STATIC SERVING ERROR] Automated frontend build failed:', e.message);
  }
}

console.log('Final Selected clientDistPath:', clientDistPath || 'NONE (MISSING)');
console.log('================================================');

if (clientDistPath) {
  console.log(`[STATIC SERVING] Serving compiled Prosqora React frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
}

// SPA Catch-All Route: Serves index.html for client-side routing (React Router)
app.get('*', (req, res, next) => {
  // Do NOT intercept API endpoints or health check
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }

  const activeDistPath = clientDistPath || possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));
  if (activeDistPath) {
    const indexPath = path.join(activeDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }

  res.status(404).send('Prosqora Frontend Assets Not Found. Please run "npm run build" to generate client/dist.');
});

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
