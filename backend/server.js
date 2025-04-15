// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const db = require('./db-config');
// const redis = require('redis');

// const app = express();
// const PORT = process.env.PORT || 8080;
// const HOST = process.env.HOST || '0.0.0.0';

// const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
// const REDIS_PORT = process.env.REDIS_PORT || 6379;

// const redisClient = redis.createClient({
//   url: `redis://${REDIS_HOST}:${REDIS_PORT}`
// });

// // Redis connection
// redisClient.connect().then(() => {
//   console.log('🚀 Connected to Redis');
// }).catch(err => {
//   console.error('❌ Redis connection error:', err);
// });

// // Middleware
// app.use(bodyParser.json());

// const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
// app.use(cors({
//   origin: ALLOWED_ORIGIN,
//   methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// console.log('CORS Allowed Origin:', ALLOWED_ORIGIN);

// // Preflight
// app.options('/api/entries', cors());

// // Health Check
// app.get('/health', (req, res) => {
//   res.status(200).send(`<html><body style="font-family: Arial; text-align: center;"><h1 style="color: green;">Server is healthy</h1></body></html>`);
// });

// // GET: Fetch All Entries with Redis Cache
// app.get('/api/entries', async (req, res) => {
//   try {
//     const cacheKey = 'all_entries';
//     const cachedData = await redisClient.get(cacheKey);

//     if (cachedData) {
//       console.log('📦 Served from Redis');
//       return res.json(JSON.parse(cachedData));
//     }

//     db.query('SELECT * FROM entries', async (err, results) => {
//       if (err) {
//         console.error('❌ Database Error:', err);
//         return res.status(500).send({ error: 'Failed to fetch entries' });
//       }

//       await redisClient.set(cacheKey, JSON.stringify(results), { EX: 60 }); // TTL = 60s
//       console.log('✅ Cached new data in Redis');
//       res.json(results);
//     });

//   } catch (err) {
//     console.error('🔥 Redis error:', err);
//     res.status(500).send({ error: 'Internal Server Error' });
//   }
// });

// // POST: Add Entry + Invalidate Cache
// app.post('/api/entries', (req, res) => {
//   const { amount, description } = req.body;

//   if (!amount || !description) {
//     return res.status(400).send({ error: 'Amount and description are required' });
//   }

//   const query = 'INSERT INTO entries (amount, description) VALUES (?, ?)';
//   db.query(query, [amount, description], async (err, result) => {
//     if (err) {
//       console.error('❌ DB Insert Error:', err);
//       return res.status(500).send({ error: 'Failed to add entry' });
//     }

//     // Invalidate Redis cache
//     await redisClient.del('all_entries');
//     console.log('♻️ Redis cache invalidated');
//     res.status(201).send({ message: 'Entry added successfully' });
//   });
// });

// // DELETE: Delete entry by ID and invalidate Redis cache
// app.delete('/api/entries/:id', async (req, res) => {
//   const entryId = req.params.id;

//   db.query('DELETE FROM entries WHERE id = ?', [entryId], async (err, result) => {
//     if (err) {
//       console.error('❌ Delete Error:', err);
//       return res.status(500).send({ error: 'Failed to delete entry' });
//     }

//     if (result.affectedRows === 0) {
//       return res.status(404).send({ error: 'Entry not found' });
//     }

//     // Invalidate cache
//     await redisClient.del('all_entries');

//     res.send({ message: `Entry ${entryId} deleted` });
//   });
// });

// // DELETE: Delete all entries and clear Redis cache
// app.delete('/api/entries', async (req, res) => {
//   db.query('DELETE FROM entries', async (err, result) => {
//     if (err) {
//       console.error('❌ Delete All Error:', err);
//       return res.status(500).send({ error: 'Failed to delete all entries' });
//     }

//     // Clear Redis cache
//     await redisClient.del('all_entries');

//     res.send({ message: 'All entries deleted', affectedRows: result.affectedRows });
//   });
// });


// // Start server
// app.listen(PORT, HOST, () => {
//   console.log(`🌐 Server running at http://${HOST}:${PORT}`);
// });
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

redisClient.connect().then(() => {
  console.log('🚀 Connected to Redis');
}).catch(err => {
  console.error('❌ Redis connection error:', err);
});

app.use(bodyParser.json());

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

console.log('CORS Allowed Origin:', ALLOWED_ORIGIN);

// Preflight
app.options('/api/entries', cors());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send(`<html><body style="font-family: Arial; text-align: center;"><h1 style="color: green;">Server is healthy</h1></body></html>`);
});

// CREATE: Add new entry
app.post('/api/entries', async (req, res) => {
  const { title, content } = req.body;
  try {
    const [result] = await db.query('INSERT INTO entries (title, content) VALUES (?, ?)', [title, content]);
    await redisClient.del('entries:all');
    res.status(201).json({ id: result.insertId, title, content });
  } catch (err) {
    console.error('Error creating entry:', err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// READ ALL: Get all entries
app.get('/api/entries', async (req, res) => {
  try {
    const cacheKey = 'entries:all';
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [rows] = await db.query('SELECT * FROM entries');
    await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 60 }); // cache for 60s
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// READ ONE: Get entry by ID
app.get('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const cacheKey = `entries:${id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [rows] = await db.query('SELECT * FROM entries WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await redisClient.set(cacheKey, JSON.stringify(rows[0]), { EX: 60 });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error fetching entry:', err);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// UPDATE: Modify an entry
app.put('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const [result] = await db.query('UPDATE entries SET title = ?, content = ? WHERE id = ?', [title, content, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Invalidate cache
    await redisClient.del('entries:all');
    await redisClient.del(`entries:${id}`);

    res.status(200).json({ id, title, content });
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE: Remove an entry
app.delete('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM entries WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await redisClient.del('entries:all');
    await redisClient.del(`entries:${id}`);

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting entry:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});

