const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const AnnualTarget = sequelize.define('AnnualTarget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  financialYear: {
    type: DataTypes.STRING(10), // e.g. "2026-27"
    allowNull: false,
    field: 'financial_year'
  },
  product: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'product'
  },
  planSales: {
    type: DataTypes.JSONB,
    defaultValue: {
      Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0,
      Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0
    },
    field: 'plan_sales'
  }
}, {
  tableName: 'annual_targets',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['financial_year', 'product']
    }
  ]
});

// Auto-sync table for this model
AnnualTarget.sync({ alter: true })
  .then(() => console.log('AnnualTarget table synced'))
  .catch(err => console.error('Error syncing AnnualTarget table:', err));

module.exports = AnnualTarget;
