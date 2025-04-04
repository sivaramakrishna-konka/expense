const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db-config'); // Ensure this points to your actual database config

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';


// Middleware
app.use(bodyParser.json());

// CORS Configuration
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;  // Allow all origins (for now)

app.use(cors({
  origin: ALLOWED_ORIGIN,   // You can set this to your frontend domain in production
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

console.log('CORS Allowed Origin:', ALLOWED_ORIGIN);

// Preflight Request Handling
app.options('/api/entries', cors());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).send(`
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 20px;">
        <h1 style="color: green;">Server is healthy</h1>
      </body>
    </html>
  `);
});

// Fetch All Entries
app.get('/api/entries', (req, res) => {
  db.query('SELECT * FROM entries', (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).send({ error: 'Failed to fetch entries' });
    }
    console.log('Fetched entries:', results);
    res.json(results);
  });
});

// Add New Entry
app.post('/api/entries', (req, res) => {
  const { amount, description } = req.body;

  // Validate input
  if (!amount || !description) {
    return res.status(400).send({ error: 'Amount and description are required' });
  }

  const query = 'INSERT INTO entries (amount, description) VALUES (?, ?)';
  db.query(query, [amount, description], (err, result) => {
    if (err) {
      console.error('Database Insert Error:', err);
      return res.status(500).send({ error: 'Failed to insert entry' });
    }
    console.log('Inserted entry with ID:', result.insertId);
    res.status(201).send({ id: result.insertId, amount, description });
  });
});

// Delete Entry by ID
app.delete('/api/entries/:id', (req, res) => {
  const entryId = req.params.id;

  const query = 'DELETE FROM entries WHERE id = ?';
  db.query(query, [entryId], (err, result) => {
    if (err) {
      console.error('Database Delete Error:', err);
      return res.status(500).send({ error: 'Failed to delete entry' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).send({ error: 'Entry not found' });
    }
    console.log('Deleted entry with ID:', entryId);
    res.status(200).send({ message: 'Entry deleted successfully' });
  });
});

// Start Server
app.listen(PORT, HOST, () => {
   console.log(`Server is running on http://${HOST}:${PORT}`);
});
