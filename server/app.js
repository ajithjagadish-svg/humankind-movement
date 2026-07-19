const path = require('path');
const express = require('express');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Placeholder until Phase 1 adds real auth + a real dashboard.
app.get('/admin', (req, res) => {
  res.render('admin/coming-soon');
});

module.exports = app;
