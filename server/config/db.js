const mongoose = require('mongoose');

let memoryServer = null;

async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production');
    }
    // Local dev convenience: no MONGODB_URI set, spin up a throwaway
    // in-memory MongoDB so `npm run dev` works before Atlas is configured.
    // Data does not persist across restarts - set MONGODB_URI to use a
    // real database (Atlas or otherwise).
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log('No MONGODB_URI set - using a temporary in-memory MongoDB for local dev.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
  return uri;
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectDB, disconnectDB };
