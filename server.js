const path = require('path');
const express = require('express');
const session = require('express-session');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const { apiNotFound, errorHandler } = require('./middlewares/errors');

const PORT = process.env.PORT || 3000;
const app = express();

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

app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', apiNotFound);
app.use(errorHandler);

sequelize
  .sync()
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
