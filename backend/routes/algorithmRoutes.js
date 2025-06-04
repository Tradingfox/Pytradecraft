const express = require('express');
const router = express.Router();
const { Algorithm, BacktestResult } = require('../models'); // Assuming db is exported from ../models/index.js

// Placeholder for authentication middleware
const authMiddleware = (req, res, next) => {
  // In a real application, this middleware would verify the user's token
  // and attach the user object to the request (e.g., req.user)
  // For this example, we'll simulate an authenticated user
  req.user = { id: 1 }; // Example user ID
  next();
};

// POST /api/algorithms - Create a new algorithm
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const algorithm = await Algorithm.create({
      name,
      code,
      description,
      UserId: req.user.id,
    });
    res.status(201).json(algorithm);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/algorithms - List algorithms for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const algorithms = await Algorithm.findAll({ where: { UserId: req.user.id } });
    res.json(algorithms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/algorithms/:id - Get a specific algorithm by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const algorithm = await Algorithm.findOne({
      where: { id: req.params.id, UserId: req.user.id },
    });
    if (!algorithm) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }
    res.json(algorithm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/algorithms/:id - Update a specific algorithm
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const [updated] = await Algorithm.update(
      { name, code, description },
      { where: { id: req.params.id, UserId: req.user.id } }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }
    const updatedAlgorithm = await Algorithm.findOne({
      where: { id: req.params.id, UserId: req.user.id },
    });
    res.json(updatedAlgorithm);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/algorithms/:id - Delete a specific algorithm
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Algorithm.destroy({
      where: { id: req.params.id, UserId: req.user.id },
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/algorithms/:algorithmId/backtests - Save a new backtest result
router.post('/:algorithmId/backtests', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, initialCapital, finalEquity, parameters } = req.body;
    // Ensure the algorithm belongs to the authenticated user
    const algorithm = await Algorithm.findOne({
      where: { id: req.params.algorithmId, UserId: req.user.id },
    });
    if (!algorithm) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }

    const backtestResult = await BacktestResult.create({
      startDate,
      endDate,
      initialCapital,
      finalEquity,
      parameters, // Assuming parameters is a JSON object
      AlgorithmId: req.params.algorithmId,
      UserId: req.user.id,
    });
    res.status(201).json(backtestResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/algorithms/:algorithmId/backtests - List backtest results for an algorithm
router.get('/:algorithmId/backtests', authMiddleware, async (req, res) => {
  try {
    // Ensure the algorithm belongs to the authenticated user before listing backtests
    const algorithm = await Algorithm.findOne({
      where: { id: req.params.algorithmId, UserId: req.user.id },
    });
    if (!algorithm) {
      return res.status(404).json({ error: 'Algorithm not found or does not belong to user' });
    }

    const backtestResults = await BacktestResult.findAll({
      where: { AlgorithmId: req.params.algorithmId, UserId: req.user.id },
    });
    res.json(backtestResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backtests/:backtestId - Get a specific backtest result by ID
router.get('/backtests/:backtestId', authMiddleware, async (req, res) => {
  try {
    const backtestResult = await BacktestResult.findOne({
      where: { id: req.params.backtestId, UserId: req.user.id },
      include: [Algorithm], // Optionally include algorithm details
    });
    if (!backtestResult) {
      return res.status(404).json({ error: 'Backtest result not found' });
    }
    // Further check: Ensure the associated algorithm also belongs to the user if not directly linking UserId in BacktestResult to Algorithm's UserId
    // This is implicitly handled if BacktestResult.UserId is always req.user.id on creation
    // and if AlgorithmId is correctly associated.
    // For added security, one might re-verify:
    // const algorithm = await Algorithm.findOne({ where: { id: backtestResult.AlgorithmId, UserId: req.user.id } });
    // if (!algorithm) {
    //   return res.status(403).json({ error: "Access denied to backtest result" });
    // }
    res.json(backtestResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
