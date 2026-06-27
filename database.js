// // database.js
// const { Sequelize } = require('sequelize');
require('dotenv').config();

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST || 'localhost',
//     port: process.env.DB_PORT || 5432,
//     dialect: 'postgres',
//     logging: false,
//     pool: {
//       max: 5,
//       min: 0,
//       acquire: 30000,
//       idle: 10000
//     }
//   }
// );

// const connectDB = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log('PostgreSQL connected successfully.');
    
//     // Sync all models
//     await sequelize.sync({ alter: true });
//     console.log('Database synced.');
    
//     return sequelize;
//   } catch (error) {
//     console.error('Unable to connect to PostgreSQL:', error);
//     process.exit(1);
//   }
// };

// module.exports = { sequelize, connectDB };

// database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log, // Enable logging to see SQL queries
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      underscored: true, // This will make sure queries use snake_case
      freezeTableName: true // Prevent Sequelize from pluralizing table names
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully.');
    
    // Don't sync automatically as we already have tables
    // await sequelize.sync({ alter: true });
    console.log('Database connection established.');
    
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };