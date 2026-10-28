const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    name: { type: DataTypes.STRING(60), allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    is_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  },
  { tableName: 'users', timestamps: false }
);

module.exports = User;
