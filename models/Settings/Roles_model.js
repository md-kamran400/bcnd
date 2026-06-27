const { DataTypes } = require('sequelize');
const sequelize = require('../../database').sequelize;

const RoleModel = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roleId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'role_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = RoleModel;