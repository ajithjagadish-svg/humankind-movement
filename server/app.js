const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blog');
const marketingRoutes = require('./routes/marketing');
const formsRoutes = require('./routes/forms');

function createApp(mongoUri) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // DigitalOcean/Cloudflare terminate HTTPS at the edge and forward to this
  // app over a plain connection - without this, Express thinks every
  // request is insecure, so the "secure" session cookie below never gets
  // sent and logins silently fail to persist.
  app.set('trust proxy', 1);

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

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

  app.get('/api/posthog-config', (req, res) => {
    res.json({
      projectToken: process.env.POSTHOG_PROJECT_TOKEN,
      host: process.env.POSTHOG_HOST,
    });
  });

  app.get('/api/posthog-identity', async (req, res) => {
    if (!req.session || !req.session.adminUserId) {
      return res.status(401).json({ user: null });
    }

    const AdminUser = require('./models/AdminUser');
    const user = await AdminUser.findById(req.session.adminUserId).select('_id email').lean();
    if (!user) return res.status(401).json({ user: null });

    return res.json({ userId: user._id.toString(), email: user.email });
  });

  app.use('/api', formsRoutes);
  app.use('/', marketingRoutes);

  return app;
}

module.exports = createApp;
