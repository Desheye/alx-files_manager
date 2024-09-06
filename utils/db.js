const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });

    // Initialize the database connection
    this.db = null;
    this.connect(database);
  }

  // Async connect method to handle database connection
  async connect(database) {
    try {
      await this.client.connect();
      console.log('Connected to MongoDB');
      this.db = this.client.db(database);
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
      this.db = null;
    }
  }

  // Method to check if the database is alive (connected)
  isAlive() {
    return !!this.db;
  }

  // Method to count the number of users in the 'users' collection
  async nbUsers() {
    if (!this.isAlive()) return 0;
    try {
      return await this.db.collection('users').countDocuments();
    } catch (err) {
      console.error('Error counting users:', err);
      return 0;
    }
  }

  // Method to count the number of files in the 'files' collection
  async nbFiles() {
    if (!this.isAlive()) return 0;
    try {
      return await this.db.collection('files').countDocuments();
    } catch (err) {
      console.error('Error counting files:', err);
      return 0;
    }
  }
}

// Create and export a single instance of DBClient
const dbClient = new DBClient();
module.exports = dbClient;
