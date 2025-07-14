const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ocpo_feedback'
});

db.connect();

app.post('/api/feedback', (req, res) => {
  const { rating, comment, date } = req.body;
  const query = 'INSERT INTO feedback (rating, comment, date) VALUES (?, ?, ?)';
  db.query(query, [rating, comment, date], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Feedback stored' });
  });
});

app.get('/api/feedback', (req, res) => {
  db.query('SELECT * FROM feedback ORDER BY date DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get('/api/stats', (req, res) => {
  db.query(
    `SELECT
      COUNT(*) AS total_feedback,
      ROUND(AVG(rating), 1) AS average_rating
    FROM feedback`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results[0]);
    }
  );
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
