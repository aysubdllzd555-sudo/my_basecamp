const { User } = require('../models');
const { fail, wrap } = require('./errors');

const requireAuth = wrap(async (req, res, next) => {
  if (!req.session.userId) return fail(res, 401, 'Please sign in first.');
  const user = await User.findByPk(req.session.userId, { attributes: ['id', 'name', 'email', 'is_admin'] });
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

module.exports = { requireAuth, requireAdmin };
