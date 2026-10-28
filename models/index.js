const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');

User.hasMany(Project, { foreignKey: { name: 'user_id', allowNull: false }, as: 'projects', onDelete: 'CASCADE', hooks: true });
Project.belongsTo(User, { foreignKey: { name: 'user_id', allowNull: false }, as: 'owner', onDelete: 'CASCADE' });

module.exports = { sequelize, User, Project };
