const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize SQLite database
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create the projects table if it doesn't exist
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT NOT NULL,
      person TEXT NOT NULL,
      client TEXT,
      contact TEXT,
      achievements REAL DEFAULT 0,
      price REAL DEFAULT 0,
      finished INTEGER DEFAULT 0
    )`
  );
});

// API endpoints

// Get all projects
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add new project
app.post('/api/projects', (req, res) => {
  const {
    title,
    description,
    deadline,
    person,
    client,
    contact,
    achievements,
    price,
    finished,
  } = req.body;
  if (!title || !deadline || !person) {
    return res
      .status(400)
      .json({ error: 'Title, deadline and person are required' });
  }
  const stmt = db.prepare(
    `INSERT INTO projects (title, description, deadline, person, client, contact, achievements, price, finished)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    title,
    description || '',
    deadline,
    person,
    client || '',
    contact || '',
    achievements || 0,
    price || 0,
    finished ? 1 : 0,
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database insertion error' });
      }
      const insertedId = this.lastID;
      db.get('SELECT * FROM projects WHERE id = ?', [insertedId], (err, row) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database retrieval error' });
        }
        res.status(201).json(row);
      });
    }
  );
  stmt.finalize();
});

// Update existing project
app.put('/api/projects/:id', (req, res) => {
  const projectId = req.params.id;
  const {
    title,
    description,
    deadline,
    person,
    client,
    contact,
    achievements,
    price,
    finished,
  } = req.body;
  db.run(
    `UPDATE projects SET title = ?, description = ?, deadline = ?, person = ?, client = ?, contact = ?, achievements = ?, price = ?, finished = ? WHERE id = ?`,
    [
      title,
      description,
      deadline,
      person,
      client,
      contact,
      achievements,
      price,
      finished ? 1 : 0,
      projectId,
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database update error' });
      }
      db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database retrieval error' });
        }
        res.json(row);
      });
    }
  );
});

// Delete a project
app.delete('/api/projects/:id', (req, res) => {
  const projectId = req.params.id;
  db.run('DELETE FROM projects WHERE id = ?', [projectId], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database deletion error' });
    }
    res.json({ success: true });
  });
});

// Serve static frontend files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Handle client-side routing by returning index.html for unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});