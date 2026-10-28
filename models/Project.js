const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define(
  'Project',
  {
    title: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' }
  },
  { tableName: 'projects', createdAt: 'created_at', updatedAt: false }
);

module.exports = Project;
