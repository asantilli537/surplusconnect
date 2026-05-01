import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import session from 'express-session';
import { engine } from 'express-handlebars';

import configRoutes from './routes/index.js';
import { getUnreadCount } from './data/notifications.js';

/*
  __dirname isn't available in ES Modules so we're reconstructing it
  from import.meta.url. needed for all the path.join calls below.
*/
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = 3000;

// setting up handlebars as the view engine
app.engine(
  'handlebars',
  engine({
    layoutsDir:    path.join(__dirname, 'views/layouts'),
    defaultLayout: 'main',
    partialsDir:   path.join(__dirname, 'views/partials'),
    helpers: {

      // checking equality between two values in templates
      if_eq(a, b, opts) {
        return a === b ? opts.fn(this) : opts.inverse(this);
      },

      // checking if a is greater than b
      if_gt(a, b, opts) {
        return a > b ? opts.fn(this) : opts.inverse(this);
      },

      // checking if a is less than b
      if_lt(a, b, opts) {
        return a < b ? opts.fn(this) : opts.inverse(this);
      },

      /*
        formatting ISO date strings into something readable for display.
        used on listing cards, history tables, and the chat thread timestamps.
        returning n/a gracefully if the value is missing or unparseable.
      */
      formatDate(isoString) {
        if (!isoString) return 'n/a';
        try {
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return isoString;
          return date.toLocaleString('en-US', {
            month:  'short',
            day:    'numeric',
            year:   'numeric',
            hour:   'numeric',
            minute: '2-digit',
            hour12: true,
          });
        } catch (e) {
          // if something weird happens just return the raw string
          return isoString;
        }
      },

      /*
        formatting just the date portion without the time.
        used on history tables where the full timestamp is too long.
      */
      formatDateOnly(isoString) {
        if (!isoString) return 'n/a';
        try {
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return isoString;
          return date.toLocaleString('en-US', {
            month: 'short',
            day:   'numeric',
            year:  'numeric',
          });
        } catch (e) {
          return isoString;
        }
      },
    },
  })
);

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// serving static assets from /public
app.use('/public', express.static(path.join(__dirname, 'public')));

// parsing form submissions and json request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- session setup ----

app.use(
  session({
    name:   'SurplusConnectSession',
    secret: 'surplusconnect_secret_key_cs546',
    resave: false,
    saveUninitialized: false,
    // 8 hours in milliseconds
    cookie: { maxAge: 1000 * 60 * 60 * 8 },
  })
);

// ---- global middleware ----

/*
  attaching unread notification count to every request so the navbar
  bell badge always shows the right number without each route having
  to pass it manually. res.locals makes it available in every template.
  wrapping in try/catch so a notification db hiccup never crashes an
  unrelated page request.
*/
app.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      res.locals.unreadCount = await getUnreadCount(req.session.user._id);
    } catch (e) {
      // not blocking the request if the notification count fails
      res.locals.unreadCount = 0;
    }
  } else {
    res.locals.unreadCount = 0;
  }
  next();
});

// ---- routes and server boot ----

configRoutes(app);

app.listen(PORT, () => {
  console.log(`SurplusConnect running on http://localhost:${PORT}`);
});