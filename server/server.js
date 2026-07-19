require('dotenv').config();

const { connectDB } = require('./config/db');
const createApp = require('./app');

const PORT = process.env.PORT || 8080;

async function start() {
  const mongoUri = await connectDB();
  const app = createApp(mongoUri);

  app.listen(PORT, () => {
    console.log(`humankindmovement-server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
