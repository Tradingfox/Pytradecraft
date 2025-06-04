const express = require('express');
const router = express.Router();
const { Indicator } = require('../models'); // Assuming db.Indicator is available

// Placeholder for authentication middleware - replace with actual implementation
const authMiddleware = (req, res, next) => {
  // Simulate an authenticated user for now
  // In a real app, this would involve token verification, session checks, etc.
  // and set req.user with authenticated user's details (e.g., id)
  req.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }; // Example UUID for a user
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  next();
};

// POST /api/indicators - Create a new indicator
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, code, description, parameters } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required for the indicator.' });
    }

    const newIndicator = await Indicator.create({
      name,
      code,
      description: description || null,
      parameters: parameters || null, // Ensure parameters are null if not provided, or {}
      UserId: req.user.id,
    });
    res.status(201).json(newIndicator);
  } catch (error) {
    console.error('Error creating indicator:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Failed to create indicator.', details: error.message });
  }
});

// GET /api/indicators - List indicators for the authenticated user (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10; // Default limit

    const offset = (page - 1) * limit;

    const { count, rows } = await Indicator.findAndCountAll({
      where: { UserId: req.user.id },
      limit,
      offset,
      order: [['updatedAt', 'DESC']],
    });

    res.json({
      indicators: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching indicators:', error);
    res.status(500).json({ error: 'Failed to fetch indicators.', details: error.message });
  }
});

// GET /api/indicators/:id - Get a specific indicator
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const indicator = await Indicator.findOne({
      where: {
        id: req.params.id,
        UserId: req.user.id
      },
    });
    if (!indicator) {
      return res.status(404).json({ error: 'Indicator not found or you do not have permission to view it.' });
    }
    res.json(indicator);
  } catch (error) {
    console.error('Error fetching indicator by ID:', error);
    res.status(500).json({ error: 'Failed to fetch indicator.', details: error.message });
  }
});

// PUT /api/indicators/:id - Update an indicator
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, code, parameters } = req.body;

    // Fields that are allowed to be updated
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (code !== undefined) updateFields.code = code;
    if (parameters !== undefined) updateFields.parameters = parameters;

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update." });
    }
    // Ensure name and code are not set to empty if they are being updated
    if (updateFields.name === '') return res.status(400).json({ error: "Name cannot be empty."});
    if (updateFields.code === '') return res.status(400).json({ error: "Code cannot be empty."});


    const [updatedRows] = await Indicator.update(updateFields, {
      where: {
        id: req.params.id,
        UserId: req.user.id
      },
    });

    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Indicator not found, no update performed, or you do not have permission.' });
    }

    const updatedIndicator = await Indicator.findOne({
        where: { id: req.params.id, UserId: req.user.id }
    });
    res.json(updatedIndicator);
  } catch (error) {
    console.error('Error updating indicator:', error);
     if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Failed to update indicator.', details: error.message });
  }
});

// DELETE /api/indicators/:id - Delete an indicator
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deletedRows = await Indicator.destroy({
      where: {
        id: req.params.id,
        UserId: req.user.id
      },
    });

    if (deletedRows === 0) {
      return res.status(404).json({ error: 'Indicator not found or you do not have permission to delete it.' });
    }
    res.status(204).send(); // No content, successful deletion
  } catch (error) {
    console.error('Error deleting indicator:', error);
    res.status(500).json({ error: 'Failed to delete indicator.', details: error.message });
  }
});

module.exports = router;
