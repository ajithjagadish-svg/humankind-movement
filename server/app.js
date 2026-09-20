const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const adminRoutes = require('./routes/admin');
const { createBlogRouter } = require('./routes/blog');
const marketingRoutes = require('./routes/marketing');
const formsRoutes = require('./routes/forms');
const { t } = require('./config/i18n');

// Paths where a redirect must never rewrite case or trailing slashes:
// tokens in URLs are case-sensitive, and admin/API/assets aren't pages.
const NO_NORMALIZE = /^\/(admin|api|assets|healthz|blog\/subscribe|es\/blog\/subscribe|fr\/blog\/subscribe)(\/|$)/;

// One canonical URL per page: www -> apex, no trailing slash, lowercase.
// Before this, www and the apex both served 200, /about/ 404'd and /ABOUT
// served a duplicate of /about. The canonical tags covered most of it, but
// search engines were still being handed multiple URLs for one page.
function canonicalUrlRedirects(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const host = (req.hostname || '').toLowerCase();
  const qIndex = req.originalUrl.indexOf('?');
  const query = qIndex >= 0 ? req.originalUrl.slice(qIndex) : '';
  let pathname = req.path;
  const wwwHost = host === 'www.humankindmovement.in';

  if (!NO_NORMALIZE.test(pathname) && !/\.[a-z0-9]+$/i.test(pathname)) {
    if (pathname.length > 1 && pathname.endsWith('/') && pathname !== '/es/' && pathname !== '/fr/') pathname = pathname.replace(/\/+$/, '');
    pathname = pathname.toLowerCase();
  }

  if (wwwHost || pathname !== req.path) {
    const origin = wwwHost ? 'https://humankindmovement.in' : '';
    return res.redirect(301, origin + pathname + query);
  }
  next();
}

function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  // No includeSubDomains: mail tracking (r.mail.humankindmovement.in) and
  // any future subdomain must not be forced to HTTPS by this app's policy.
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
}

function createApp(mongoUri) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // DigitalOcean/Cloudflare terminate HTTPS at the edge and forward to this
  // app over a plain connection - without this, Express thinks every
  // request is insecure, so the "secure" session cookie below never gets
  // sent and logins silently fail to persist.
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(canonicalUrlRedirects);

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
  app.use('/blog', createBlogRouter('en'));
  app.use('/es/blog', createBlogRouter('es'));
  app.use('/fr/blog', createBlogRouter('fr'));

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

  // Anything no route claimed. A branded page with real links beats the
  // default "Cannot GET /x" dead end for both people and crawlers.
  app.use((req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not_found' });
    const m = req.path.match(/^\/(es|fr)(\/|$)/);
    const lang = m ? m[1] : 'en';
    res.status(404).render('404', { lang, t: t(lang) });
  });

  return app;
}

module.exports = createApp;
