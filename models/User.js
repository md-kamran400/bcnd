// models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'name'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'email',
    validate: {
      isEmail: true
    }
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'employee_id'
  },
  passwordHash: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'Employee',
    field: 'role'
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'department'
  },
  managedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'managed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedTeam: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'assigned_team'
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_login_attempts'
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'lock_until'
  },
  mfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'mfa_enabled'
  },
  otpCodeHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'otp_code_hash'
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'otp_expires_at'
  },
  otpAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'otp_attempts'
  },
  setupTokenHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'setup_token_hash'
  },
  setupTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'setup_token_expires_at'
  },
  setupTokenUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'setup_token_used'
  },
  resetTokenHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_token_hash'
  },
  resetTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_token_expires_at'
  },
  resetTokenUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reset_token_used'
  },
  resetOtpCodeHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_otp_code_hash'
  },
  resetOtpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_otp_expires_at'
  },
  resetOtpAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'reset_otp_attempts'
  },
  resetVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reset_verified'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      // Only hash if it's not already hashed (for new users)
      if (user.passwordHash && !user.passwordHash.startsWith('$2') && !user.passwordHash.startsWith('$argon2')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
    beforeUpdate: async (user) => {
      // Only hash if password is being changed and not already hashed
      if (user.changed('passwordHash') && 
          user.passwordHash && 
          !user.passwordHash.startsWith('$2') && 
          !user.passwordHash.startsWith('$argon2')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    }
  }
});

// Self-reference for team management
User.belongsTo(User, { as: 'manager', foreignKey: 'managed_by', targetKey: 'id' });
User.hasMany(User, { as: 'teamMembers', foreignKey: 'managed_by', sourceKey: 'id' });

// Instance methods
User.prototype.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

User.prototype.comparePassword = async function(password) {
  try {
    console.log('Password hash type:', this.passwordHash.substring(0, 10));
    
    // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (this.passwordHash.startsWith('$2')) {
      console.log('Using bcrypt comparison');
      return await bcrypt.compare(password, this.passwordHash);
    } 
    // For Argon2 hashes (starts with $argon2)
    else if (this.passwordHash.startsWith('$argon2')) {
      console.log('Using argon2 comparison');
      try {
        return await argon2.verify(this.passwordHash, password);
      } catch (argonError) {
        console.error('Argon2 verification error:', argonError);
        return false;
      }
    }
    
    console.log('Unknown hash type');
    return false;
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

module.exports = User;