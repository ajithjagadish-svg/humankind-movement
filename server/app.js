const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blog');

function createApp(mongoUri) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // On DigitalOcean, /assets/* is routed straight to the static site
  // component and never reaches this service. Serving it here too is
  // harmless (unreachable in production) and lets `npm run dev` render
  // pages correctly against the same assets/ folder without needing the
  // static component running alongside it.
  app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: mongoUri, collectionName: 'sessions' }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/admin', adminRoutes);
  app.use('/blog', blogRoutes);

  return app;
}

module.exports = createApp;
