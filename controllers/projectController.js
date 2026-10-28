const { User, Project } = require('../models');
const { fail, wrap, parseId } = require('../middlewares/errors');

const withOwner = [{ model: User, as: 'owner', attributes: ['name'] }];

const present = (project) => ({
  id: project.id,
  title: project.title,
  description: project.description,
  user_id: project.user_id,
  created_at: project.created_at,
  owner_name: project.owner ? project.owner.name : ''
});

const readBody = (body) => {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  if (!title) return { error: 'Project title is required.' };
  if (title.length > 100) return { error: 'Project title cannot be longer than 100 characters.' };
  if (description.length > 1000) return { error: 'Description cannot be longer than 1000 characters.' };
  return { title, description };
};

exports.loadEditable = wrap(async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid project id.');
  const project = await Project.findByPk(id);
  if (!project) return fail(res, 404, 'Project not found.');
  if (project.user_id !== req.user.id && !req.user.is_admin) return fail(res, 403, 'You are not allowed to change this project.');
  req.project = project;
  next();
});

exports.index = async (req, res) => {
  const projects = await Project.findAll({ include: withOwner, order: [['id', 'DESC']] });
  res.json(projects.map(present));
};

exports.show = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid project id.');
  const project = await Project.findByPk(id, { include: withOwner });
  if (!project) return fail(res, 404, 'Project not found.');
  res.json(present(project));
};

exports.create = async (req, res) => {
  const data = readBody(req.body);
  if (data.error) return fail(res, 400, data.error);
  const project = await Project.create({ title: data.title, description: data.description, user_id: req.user.id });
  res.status(201).json(present(await Project.findByPk(project.id, { include: withOwner })));
};

exports.update = async (req, res) => {
  const data = readBody(req.body);
  if (data.error) return fail(res, 400, data.error);
  await req.project.update({ title: data.title, description: data.description });
  res.json(present(await Project.findByPk(req.project.id, { include: withOwner })));
};

exports.destroy = async (req, res) => {
  await req.project.destroy();
  res.json({ message: 'Project deleted.' });
};
