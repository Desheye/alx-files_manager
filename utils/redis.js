// Import the Redis library
const redis = require('redis');

// Define the RedisClient class
function RedisClient() {
  // Create a Redis client
  const client = redis.createClient();

  // Handle any error that occurs with the Redis client
  client.on('error', (error) => {
    console.error('Redis client error:', error);
  });

  // Optional: Log when the client is connected
  client.on('connect', () => {
    console.log('Connected to Redis');
  });

  // Define the isAlive function to check if the Redis client is connected
  function isAlive() {
    // Return true if the Redis client is connected, otherwise return false
    return client.connected;
  }

  // Define an asynchronous get function to retrieve a value by key from Redis
  async function get(key) {
    // Return a Promise that resolves with the value stored in Redis for the provided key
    return new Promise((resolve, reject) => {
      client.get(key, (err, value) => {
        if (err) {
          reject(new Error(`Error getting key ${key}: ${err.message}`));
        } else {
          resolve(value);
        }
      });
    });
  }

  // Define an asynchronous set function to store a key-value pair in Redis with an expiration time
  async function set(key, value, duration) {
    // Return a Promise that resolves after storing the value with an expiration time
    return new Promise((resolve, reject) => {
      client.setex(key, duration, value, (err) => {
        if (err) {
          reject(new Error(`Error setting key ${key}: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  // Define an asynchronous del function to remove a key-value pair from Redis
  async function del(key) {
    // Return a Promise that resolves after deleting the key-value pair from Redis
    return new Promise((resolve, reject) => {
      client.del(key, (err) => {
        if (err) {
          reject(new Error(`Error deleting key ${key}: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  // Return the public methods that can be accessed from outside
  return {
    isAlive,
    get,
    set,
    del,
  };
}

// Create and export an instance of the RedisClient class
const redisClient = RedisClient();
module.exports = redisClient;
