const { DataTypes } = require('sequelize');
const sequelize = require('../../database').sequelize;

const DepartmentModel = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  departmentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'department_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'departments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DepartmentModel;