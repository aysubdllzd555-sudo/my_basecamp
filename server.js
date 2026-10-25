const path = require('path');
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;
const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'basecamp.db'));

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setup() {
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0
  )`);
  await run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
}

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'my-basecamp-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);
app.use(express.static(path.join(__dirname, 'view')));

const fail = (res, status, message) => res.status(status).json({ error: message });

const requireAuth = wrap(async (req, res, next) => {
  if (!req.session.userId) return fail(res, 401, 'Please sign in first.');
  const user = await get('SELECT id, name, email, is_admin FROM users WHERE id = ?', [req.session.userId]);
  if (!user) {
    req.session.destroy(() => {});
    return fail(res, 401, 'User not found.');
  }
  req.user = user;
  next();
});

const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) return fail(res, 403, 'This action is for admins only.');
  next();
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

app.post('/api/signup', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmation = req.body.password_confirmation;

  if (!name || !email || !password) return fail(res, 400, 'Please fill in all fields.');
  if (name.length > 60) return fail(res, 400, 'Name cannot be longer than 60 characters.');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Email address is not valid.');
  if (password.length < 6 || password.length > 72) return fail(res, 400, 'Password must be 6 to 72 characters.');
  if (confirmation !== undefined && confirmation !== password) return fail(res, 400, 'Passwords do not match.');

  const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return fail(res, 400, 'This email is already registered.');

  const count = await get('SELECT COUNT(*) AS total FROM users');
  const hash = await bcrypt.hash(password, 10);
  const result = await run('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)', [
    name,
    email,
    hash,
    count.total === 0 ? 1 : 0
  ]);
  res.status(201).json({ id: result.id, message: 'Sign up complete.' });
}));

app.post('/api/signin', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return fail(res, 400, 'Email and password are required.');

  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) return fail(res, 401, 'Email or password is incorrect.');

  req.session.regenerate((err) => {
    if (err) return fail(res, 500, 'Could not create the session.');
    req.session.userId = user.id;
    res.json({ message: 'Signed in.' });
  });
}));

app.post('/api/signout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Signed out.' });
  });
});

app.get('/api/current_user', wrap(async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = await get('SELECT id, name, email, is_admin FROM users WHERE id = ?', [req.session.userId]);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, id: user.id, name: user.name, email: user.email, isAdmin: !!user.is_admin });
}));

app.get('/api/users', requireAuth, wrap(async (req, res) => {
  const users = await all('SELECT id, name, is_admin FROM users ORDER BY id');
  res.json(users);
}));

app.get('/api/users/:id', requireAuth, wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid user id.');
  const user = await get('SELECT id, name, email, is_admin FROM users WHERE id = ?', [id]);
  if (!user) return fail(res, 404, 'User not found.');
  res.json(user);
}));

app.delete('/api/users/:id', requireAuth, wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid user id.');
  if (req.user.id !== id && !req.user.is_admin) return fail(res, 403, 'You cannot delete another user\'s account.');

  const target = await get('SELECT id, is_admin FROM users WHERE id = ?', [id]);
  if (!target) return fail(res, 404, 'User not found.');

  if (target.is_admin) {
    const admins = await get('SELECT COUNT(*) AS total FROM users WHERE is_admin = 1');
    if (admins.total <= 1) return fail(res, 400, 'The last admin account cannot be deleted.');
  }

  await run('DELETE FROM projects WHERE user_id = ?', [id]);
  await run('DELETE FROM users WHERE id = ?', [id]);
  if (req.user.id === id) {
    return req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Account deleted.' });
    });
  }
  res.json({ message: 'User deleted.' });
}));

const changeRole = (makeAdmin) =>
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, 'Invalid user id.');
    const target = await get('SELECT id, is_admin FROM users WHERE id = ?', [id]);
    if (!target) return fail(res, 404, 'User not found.');

    if (!makeAdmin && target.is_admin) {
      const admins = await get('SELECT COUNT(*) AS total FROM users WHERE is_admin = 1');
      if (admins.total <= 1) return fail(res, 400, 'The last admin cannot lose the admin role.');
    }

    await run('UPDATE users SET is_admin = ? WHERE id = ?', [makeAdmin ? 1 : 0, id]);
    res.json({ message: makeAdmin ? 'User is now an admin.' : 'Admin role removed.' });
  });

app.put('/api/users/:id/set_admin', requireAuth, requireAdmin, changeRole(true));
app.put('/api/users/:id/remove_admin', requireAuth, requireAdmin, changeRole(false));

const PROJECT_SELECT = `SELECT p.id, p.title, p.description, p.user_id, p.created_at, u.name AS owner_name
  FROM projects p JOIN users u ON u.id = p.user_id`;

const readProjectBody = (body) => {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  if (!title) return { error: 'Project title is required.' };
  if (title.length > 100) return { error: 'Project title cannot be longer than 100 characters.' };
  if (description.length > 1000) return { error: 'Description cannot be longer than 1000 characters.' };
  return { title, description };
};

const loadEditableProject = wrap(async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid project id.');
  const project = await get('SELECT * FROM projects WHERE id = ?', [id]);
  if (!project) return fail(res, 404, 'Project not found.');
  if (project.user_id !== req.user.id && !req.user.is_admin) return fail(res, 403, 'You are not allowed to change this project.');
  req.project = project;
  next();
});

app.get('/api/projects', requireAuth, wrap(async (req, res) => {
  res.json(await all(`${PROJECT_SELECT} ORDER BY p.id DESC`));
}));

app.get('/api/projects/:id', requireAuth, wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid project id.');
  const project = await get(`${PROJECT_SELECT} WHERE p.id = ?`, [id]);
  if (!project) return fail(res, 404, 'Project not found.');
  res.json(project);
}));

app.post('/api/projects', requireAuth, wrap(async (req, res) => {
  const data = readProjectBody(req.body);
  if (data.error) return fail(res, 400, data.error);
  const result = await run('INSERT INTO projects (title, description, user_id) VALUES (?, ?, ?)', [
    data.title,
    data.description,
    req.user.id
  ]);
  res.status(201).json(await get(`${PROJECT_SELECT} WHERE p.id = ?`, [result.id]));
}));

app.put('/api/projects/:id', requireAuth, loadEditableProject, wrap(async (req, res) => {
  const data = readProjectBody(req.body);
  if (data.error) return fail(res, 400, data.error);
  await run('UPDATE projects SET title = ?, description = ? WHERE id = ?', [data.title, data.description, req.project.id]);
  res.json(await get(`${PROJECT_SELECT} WHERE p.id = ?`, [req.project.id]));
}));

app.delete('/api/projects/:id', requireAuth, loadEditableProject, wrap(async (req, res) => {
  await run('DELETE FROM projects WHERE id = ?', [req.project.id]);
  res.json({ message: 'Project deleted.' });
}));

app.use('/api', (req, res) => fail(res, 404, 'Unknown API route.'));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return fail(res, 400, 'The submitted data is not valid.');
  console.error(err);
  if (res.headersSent) return next(err);
  fail(res, 500, 'Something went wrong on the server.');
});

setup()
  .then(() => {
    const server = app.listen(PORT, () => console.log(`MyBasecamp: http://localhost:${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the old server or run it with a different PORT.`);
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });