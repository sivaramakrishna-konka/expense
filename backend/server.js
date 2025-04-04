const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db-config');
const redis = require('redis');

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

// GET: Fetch All Entries with Redis Cache
app.get('/api/entries', async (req, res) => {
  try {
    const cacheKey = 'all_entries';
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log('📦 Served from Redis');
      return res.json(JSON.parse(cachedData));
    }

    db.query('SELECT * FROM entries', async (err, results) => {
      if (err) {
        console.error('❌ Database Error:', err);
        return res.status(500).send({ error: 'Failed to fetch entries' });
      }

      await redisClient.set(cacheKey, JSON.stringify(results), { EX: 60 }); // TTL = 60s
      console.log('✅ Cached new data in Redis');
      res.json(results);
    });

  } catch (err) {
    console.error('🔥 Redis error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
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

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🌐 Server running at http://${HOST}:${PORT}`);
});
