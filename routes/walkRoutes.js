const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all walk requests (for walkers to view)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// POST a new walk request (from owner)
router.post('/', async (req, res) => {
  const { dog_id, requested_time, duration_minutes, location } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
      VALUES (?, ?, ?, ?)
    `, [dog_id, requested_time, duration_minutes, location]);

    res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create walk request' });
  }
});

// POST an application to walk a dog (from walker)
router.post('/apply', async (req, res) => {
  const { request_id, walker_id } = req.body;

  if (!request_id || !walker_id) {
    return res.status(400).json({ error: 'Missing request_id or walker_id' });
  }

  try {
    await db.query(
      'INSERT INTO WalkApplications (request_id, walker_id) VALUES (?, ?)',
      [request_id, walker_id]
    );
    res.json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error('SQL Error:', err);
    res.status(500).json({ error: 'Failed to apply for the walk' });
  }
});

module.exports = router;