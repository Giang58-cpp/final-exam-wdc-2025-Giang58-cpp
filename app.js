const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./models/db');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));  
app.use(express.static(path.join(__dirname, '/public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'some-default-secret', 
  resave: false,
  saveUninitialized: false,
}));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const [rows] = await db.query(
        'SELECT user_id, username, role, password_hash FROM Users WHERE email = ?',
        [email]
      );
  
      if (rows.length === 0 || rows[0].password_hash !== password) {
        return res.send('Invalid credentials. <a href="/">Try again</a>');
      }
  
      // Save user info to session
      req.session.user = {
        user_id: rows[0].user_id,
        username: rows[0].username,
        role: rows[0].role
      };
  
      // Redirect based on role
      if (rows[0].role === 'owner') return res.redirect('/owner-dashboard.html');
      if (rows[0].role === 'walker') return res.redirect('/walker-dashboard.html');
  
      res.send('Unknown role');
    } catch (err) {
      res.status(500).send('Server error');
    }
  });

app.get('/', (req, res) => {
    if (req.session.user) {
      // Redirect logged-in user based on role
      return res.redirect(req.session.user.role === 'owner' ? '/owner' : '/walker');
    }
  
    // Serve the login form HTML 
    res.send(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Login - Dog Walking Service</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  </head>
  <body class="bg-light">
  
    <div class="container py-5" style="max-width: 400px;">
      <h1 class="mb-4 text-primary">Login</h1>
  
      <form method="POST" action="/login">
        <div class="mb-3">
          <label for="email" class="form-label">Email address</label>
          <input id="email" name="email" type="email" class="form-control" required />
        </div>
  
        <div class="mb-3">
          <label for="password" class="form-label">Password</label>
          <input id="password" name="password" type="password" class="form-control" required />
        </div>
  
        <button type="submit" class="btn btn-primary w-100">Log In</button>
      </form>
    </div>
  
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  </body>
  </html>`);
  });

//Logout  
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send('Logout failed');
      }
      res.clearCookie('connect.sid'); // clear session cookie
      res.redirect('/');
    });
});

//get api for owner of dog
app.get('/api/owner/dogs', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'owner') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
  
    try {
      const [rows] = await db.query(
        'SELECT dog_id, name FROM Dogs WHERE owner_id = ?',
        [req.session.user.user_id]
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Request apply  
app.get('/api/users/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    res.json(req.session.user);
  });

app.get('/owner', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'owner') return res.redirect('/');
    res.send(`<h1>Owner Dashboard</h1><p>Welcome, ${req.session.user.username}</p>`);
  });
  
  app.get('/walker', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'walker') return res.redirect('/');
    res.send(`<h1>Walker Dashboard</h1><p>Welcome, ${req.session.user.username}</p>`);
});
  

const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api', userRoutes);

module.exports = app;