const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`[DB Config] Created data directory: ${dataDir}`);
  } catch (err) {
    console.error(`[DB Config] Error creating data directory ${dataDir}:`, err);
    // Depending on the desired behavior, you might want to throw the error
    // or handle it by trying to proceed (Sequelize might still create the file if the path is writable)
  }
}

const storagePath = process.env.NODE_ENV === 'test'
  ? path.join(dataDir, 'test-database.sqlite')
  : path.join(dataDir, 'database.sqlite');

console.log(`[DB Config] Database storage path: ${storagePath}`);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    // Optional: Define global model options here
    // underscored: true, // e.g., to use snake_case for table and column names
  }
});

module.exports = sequelize;
