const { User, Project } = require('../models');
const { fail, parseId } = require('../middlewares/errors');

const lastAdmin = async (target) => target.is_admin && (await User.count({ where: { is_admin: true } })) <= 1;

exports.index = async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'name', 'is_admin'], order: [['id', 'ASC']] });
  res.json(users);
};

exports.show = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid user id.');
  const user = await User.findByPk(id, { attributes: ['id', 'name', 'email', 'is_admin'] });
  if (!user) return fail(res, 404, 'User not found.');
  res.json(user);
};

exports.destroy = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid user id.');
  if (req.user.id !== id && !req.user.is_admin) return fail(res, 403, "You cannot delete another user's account.");

  const target = await User.findByPk(id);
  if (!target) return fail(res, 404, 'User not found.');
  if (await lastAdmin(target)) return fail(res, 400, 'The last admin account cannot be deleted.');

  await Project.destroy({ where: { user_id: id } });
  await target.destroy();

  if (req.user.id === id) {
    return req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Account deleted.' });
    });
  }
  res.json({ message: 'User deleted.' });
};

const changeRole = (makeAdmin) => async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid user id.');
  const target = await User.findByPk(id);
  if (!target) return fail(res, 404, 'User not found.');
  if (!makeAdmin && (await lastAdmin(target))) return fail(res, 400, 'The last admin cannot lose the admin role.');

  await target.update({ is_admin: makeAdmin });
  res.json({ message: makeAdmin ? 'User is now an admin.' : 'Admin role removed.' });
};

exports.setAdmin = changeRole(true);
exports.removeAdmin = changeRole(false);
