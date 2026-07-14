const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const MonthlySalesPlan = sequelize.define('MonthlySalesPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  month: {
    type: DataTypes.STRING(7), // YYYY-MM format
    allowNull: false,
    field: 'month'
  },
  product: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'product'
  },
  salesPerson: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'sales_person'
  },
  planQty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'plan_qty'
  },
  planValue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'plan_value'
  },
  w1Qty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w1_qty'
  },
  w1Value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w1_value'
  },
  w2Qty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w2_qty'
  },
  w2Value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w2_value'
  },
  w3Qty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w3_qty'
  },
  w3Value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w3_value'
  },
  w4Qty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w4_qty'
  },
  w4Value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'w4_value'
  },
  prevPlanQty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'prev_plan_qty'
  },
  prevPlanValue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'prev_plan_value'
  },
  prevTotalQty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'prev_total_qty'
  },
  prevTotalValue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'prev_total_value'
  },
  auditLogs: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'audit_logs'
  }
}, {
  tableName: 'monthly_sales_plans',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['month', 'product', 'sales_person']
    }
  ]
});

module.exports = MonthlySalesPlan;
