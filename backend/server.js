module.exports = app;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db-config');
const redis = require('redis');
const request = require('supertest');


const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});

// Redis connection
redisClient.connect().then(() => {
  console.log('🚀 Connected to Redis');
}).catch(err => {
  console.error('❌ Redis connection error:', err);
});

// Middleware
app.use(bodyParser.json());

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

console.log('CORS Allowed Origin:', ALLOWED_ORIGIN);

// Preflight
app.options('/api/entries', cors());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send(`<html><body style="font-family: Arial; text-align: center;"><h1 style="color: green;">Server is healthy</h1></body></html>`);
});
app.get('/api/entries', async (req, res) => {
  const cacheKey = 'entries_cache';

  try {
    // Check Redis for cached data
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      console.log('✅ Served from Redis cache');
      return res.status(200).json(JSON.parse(cached));
    }

    // If no cache, get from DB
    db.query('SELECT * FROM entries', async (err, results) => {
      if (err) {
        console.error('❌ DB error:', err);
        return res.status(500).json({ error: 'Database query error' });
      }

      // Cache the result for 1 hour
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(results));
      console.log('✅ Served from DB and cached');
      return res.status(200).json(results);
    });

  } catch (err) {
    console.error('❌ Redis or DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST: Add Entry + Invalidate Cache
app.post('/api/entries', (req, res) => {
  const { amount, description } = req.body;

  if (!amount || !description) {
    return res.status(400).send({ error: 'Amount and description are required' });
  }

  const query = 'INSERT INTO entries (amount, description) VALUES (?, ?)';
  db.query(query, [amount, description], async (err, result) => {
    if (err) {
      console.error('❌ DB Insert Error:', err);
      return res.status(500).send({ error: 'Failed to add entry' });
    }

    // Invalidate Redis cache
    await redisClient.del('all_entries');
    console.log('♻️ Redis cache invalidated');
    res.status(201).send({ message: 'Entry added successfully' });
  });
});

app.post('/api/entries', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  db.query('INSERT INTO entries (title, content) VALUES (?, ?)', [title, content], async (err, result) => {
    if (err) {
      console.error('❌ Insert error:', err);
      return res.status(500).json({ error: 'Failed to insert entry' });
    }

    // Clear cache so next GET reloads data
    await redisClient.del('entries_cache');
    res.status(201).json({ message: 'Entry created', id: result.insertId });
  });
});


// DELETE: Delete entry by ID and invalidate Redis cache
app.delete('/api/entries/:id', async (req, res) => {
  const entryId = req.params.id;

  db.query('DELETE FROM entries WHERE id = ?', [entryId], async (err, result) => {
    if (err) {
      console.error('❌ Delete error:', err);
      return res.status(500).json({ error: 'Failed to delete entry' });
    }

    // Clear cache after delete
    await redisClient.del('entries_cache');
    res.status(200).json({ message: 'Entry deleted' });
  });
});

// DELETE: Delete all entries and clear Redis cache
app.delete('/api/entries', async (req, res) => {
  db.query('DELETE FROM entries', async (err, result) => {
    if (err) {
      console.error('❌ Delete All Error:', err);
      return res.status(500).send({ error: 'Failed to delete all entries' });
    }

    // Clear Redis cache
    await redisClient.del('all_entries');

    res.send({ message: 'All entries deleted', affectedRows: result.affectedRows });
  });
});


// Start server
app.listen(PORT, HOST, () => {
  console.log(`🌐 Server running at http://${HOST}:${PORT}`);
});
