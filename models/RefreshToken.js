// models/RefreshToken.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tokenId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'token_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'revoked'
  },
  replacedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'replaced_by'
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Association
RefreshToken.belongsTo(require('./User'), { foreignKey: 'user_id', targetKey: 'id' });

module.exports = RefreshToken;