const express = require('express');
const router = express.Router();
const { Algorithm, Deployment, DeploymentLog } = require('../models/index.cjs');

// Placeholder for authentication middleware (matches the one in algorithmRoutes.js)
const authMiddleware = (req, res, next) => {
  // In a real application, this middleware would verify the user's token
  // and attach the user object to the request (e.g., req.user)
  // For this example, we'll simulate an authenticated user
  req.user = { id: 1 }; // Example user ID
  next();
};

// Handle special routes for account and algorithm deployments
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Check if this is a request for account deployments
    if (req.accountId) {
      const deployments = await Deployment.findAll({
        where: { 
          accountId: req.accountId,
          UserId: req.user.id
        },
        order: [['createdAt', 'DESC']]
      });
      
      return res.json(deployments);
    }
    
    // Check if this is a request for algorithm deployments
    if (req.algorithmId) {
      // Verify the algorithm exists and belongs to the user
      const algorithm = await Algorithm.findOne({
        where: { id: req.algorithmId, UserId: req.user.id }
      });
      
      if (!algorithm) {
        return res.status(404).json({ error: 'Algorithm not found' });
      }
      
      const deployments = await Deployment.findAll({
        where: { 
          algorithmId: req.algorithmId,
          UserId: req.user.id
        },
        order: [['createdAt', 'DESC']]
      });
      
      return res.json(deployments);
    }
    
    // Regular deployments list (all user deployments)
    const deployments = await Deployment.findAll({
      where: { UserId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/deployments - Create a new deployment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { algorithmId, accountId, parameters } = req.body;
    
    // Verify the algorithm exists and belongs to the user
    const algorithm = await Algorithm.findOne({
      where: { id: algorithmId, UserId: req.user.id }
    });
    
    if (!algorithm) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }
    
    // Create the deployment
    const deployment = await Deployment.create({
      algorithmId,
      algorithmName: algorithm.name,
      accountId,
      status: 'pending',
      parameters: parameters || {},
      UserId: req.user.id
    });
    
    // Create initial deployment log
    await DeploymentLog.create({
      deploymentId: deployment.id,
      message: `Deployment of "${algorithm.name}" initiated`,
      level: 'info',
      timestamp: new Date(),
      UserId: req.user.id
    });
    
    res.status(201).json(deployment);
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/deployments/:id - Get a specific deployment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, UserId: req.user.id }
    });
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    res.json(deployment);
  } catch (error) {
    console.error('Error fetching deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/deployments/:id/status - Get deployment status
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, UserId: req.user.id }
    });
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    // Generate sample metrics for demonstration
    const status = {
      id: deployment.id,
      status: deployment.status,
      updatedAt: deployment.updatedAt,
      metrics: {
        orders: Math.floor(Math.random() * 50),
        trades: Math.floor(Math.random() * 30),
        profitLoss: parseFloat((Math.random() * 2000 - 1000).toFixed(2)),
        runningTime: deployment.status === 'running' ? 
          `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)}:${Math.floor(Math.random() * 60)}` : 
          '00:00:00'
      },
      lastEvent: {
        type: 'status_update',
        message: `Deployment ${deployment.status}`,
        timestamp: new Date().toISOString()
      },
      resourceUsage: {
        cpu: parseFloat((Math.random() * 80).toFixed(1)),
        memory: parseFloat((Math.random() * 200).toFixed(1)),
        network: parseFloat((Math.random() * 50).toFixed(1))
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error fetching deployment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/deployments/:id/stop - Stop a deployment
router.post('/:id/stop', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, UserId: req.user.id }
    });
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    if (deployment.status !== 'running' && deployment.status !== 'pending') {
      return res.status(400).json({ error: `Cannot stop deployment with status: ${deployment.status}` });
    }
    
    // Update deployment status
    await deployment.update({ status: 'stopped' });
    
    // Create log entry
    await DeploymentLog.create({
      deploymentId: deployment.id,
      message: `Deployment of "${deployment.algorithmName}" stopped by user`,
      level: 'info',
      timestamp: new Date(),
      UserId: req.user.id
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error stopping deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/deployments/:id - Delete a deployment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, UserId: req.user.id }
    });
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    // Delete associated logs first
    await DeploymentLog.destroy({
      where: { deploymentId: deployment.id }
    });
    
    // Delete the deployment
    await deployment.destroy();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/deployments/:id/logs - Get logs for a deployment
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      where: { id: req.params.id, UserId: req.user.id }
    });
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await DeploymentLog.findAll({
      where: { deploymentId: deployment.id },
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
    
    // Format logs as strings
    const formattedLogs = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] ${log.level.toUpperCase()}: ${log.message}`
    );
    
    res.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 