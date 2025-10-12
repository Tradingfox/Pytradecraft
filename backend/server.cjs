const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models/index.cjs');
const algorithmRoutes = require('./routes/algorithmRoutes.cjs');
const deploymentRoutes = require('./routes/deploymentRoutes.cjs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (if we have a build folder with frontend assets)
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected'
  });
});

// API Routes
app.use('/api/algorithms', algorithmRoutes);

// Account deployments route needs to come before the general deployments route
app.use('/api/accounts/:accountId/deployments', (req, res, next) => {
  const accountId = req.params.accountId;
  // Store accountId in request for the deploymentRoutes handler
  req.accountId = accountId;
  next();
}, deploymentRoutes);

// Algorithm deployments route
app.use('/api/algorithms/:algorithmId/deployments', (req, res, next) => {
  const algorithmId = req.params.algorithmId;
  // Store algorithmId in request for the deploymentRoutes handler
  req.algorithmId = algorithmId;
  next();
}, deploymentRoutes);

// General deployments route
app.use('/api/deployments', deploymentRoutes);

// Fallback route for SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Sync database and start server
const startServer = async () => {
  try {
    // Sync database with { alter: true } for development
    // In production, you should use migrations instead
    await db.syncDb({ alter: true });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer(); 