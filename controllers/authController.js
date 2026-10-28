const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { fail } = require('../middlewares/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.signup = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmation = req.body.password_confirmation;

  if (!name || !email || !password) return fail(res, 400, 'Please fill in all fields.');
  if (name.length > 60) return fail(res, 400, 'Name cannot be longer than 60 characters.');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Email address is not valid.');
  if (password.length < 6 || password.length > 72) return fail(res, 400, 'Password must be 6 to 72 characters.');
  if (confirmation !== undefined && confirmation !== password) return fail(res, 400, 'Passwords do not match.');

  const exists = await User.findOne({ where: { email } });
  if (exists) return fail(res, 400, 'This email is already registered.');

  const total = await User.count();
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    is_admin: total === 0
  });
  res.status(201).json({ id: user.id, message: 'Sign up complete.' });
};

exports.signin = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return fail(res, 400, 'Email and password are required.');

  const user = await User.findOne({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) return fail(res, 401, 'Email or password is incorrect.');

  req.session.regenerate((err) => {
    if (err) return fail(res, 500, 'Could not create the session.');
    req.session.userId = user.id;
    res.json({ message: 'Signed in.' });
  });
};

exports.signout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Signed out.' });
  });
};

exports.currentUser = async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = await User.findByPk(req.session.userId, { attributes: ['id', 'name', 'email', 'is_admin'] });
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, id: user.id, name: user.name, email: user.email, isAdmin: !!user.is_admin });
};
