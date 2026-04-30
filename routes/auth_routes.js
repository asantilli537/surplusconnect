import { Router } from 'express';
import { requireGuest } from '../middleware.js';
import { createUser, loginUser } from '../data/users.js';
import { getNotificationsForUser, markAllAsRead } from '../data/notifications.js';

const router = Router();

// ---- landing page ----

router.route('/').get(async (req, res) => {
  // sending logged-in users straight to their role dashboard
  if (req.session.user) {
    const { role } = req.session.user;
    if (role === 'donor')       return res.redirect('/donor/dashboard');
    if (role === 'distributor') return res.redirect('/distributor/dashboard');
    if (role === 'volunteer')   return res.redirect('/volunteer/dashboard');
    if (role === 'admin')       return res.redirect('/admin/dashboard');
  }

  return res.render('home', {
    pageTitle: 'Welcome',
    user: null,
  });
});

// ---- login ----

router.route('/login')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/login', {
      pageTitle:   'Sign In',
      user:        null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {
    const { email, password } = req.body;

    // route-level check before calling the data function
    if (!email || !password ||
        typeof email !== 'string' || typeof password !== 'string' ||
        email.trim().length === 0 || password.trim().length === 0) {
      return res.status(400).render('auth/login', {
        pageTitle:    'Sign In',
        user:         null,
        errorMessage: 'email and password are both required',
        prevEmail:    email || '',
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }

    try {
      const user = await loginUser(email, password);

      // storing session data, never storing the password hash
      req.session.user = user;

      if (user.role === 'donor')       return res.redirect('/donor/dashboard');
      if (user.role === 'distributor') return res.redirect('/distributor/dashboard');
      if (user.role === 'volunteer')   return res.redirect('/volunteer/dashboard');
      if (user.role === 'admin')       return res.redirect('/admin/dashboard');

      return res.redirect('/');
    } catch (e) {
      return res.status(400).render('auth/login', {
        pageTitle:    'Sign In',
        user:         null,
        errorMessage: e.message,
        prevEmail:    email || '',
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }
  });

// ---- role selection ----

router.route('/signup').get(requireGuest, async (req, res) => {
  return res.render('auth/signup-select', {
    pageTitle: 'Create an Account',
    user: null,
  });
});

// ---- donor signup ----

/*
  required fields for donor registration. confirmPassword is
  checked here in the route before calling createUser since
  the data function only receives one password field.
*/
const donorRequiredFields = [
  'firstName', 'lastName', 'email', 'phoneNumber',
  'password', 'confirmPassword', 'organizationName',
  'street', 'city', 'state', 'zipCode',
];

router.route('/signup/donor')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-donor', {
      pageTitle:   'Register as a Food Donor',
      user:        null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {

    // route-level presence check before anything else
    for (const field of donorRequiredFields) {
      if (!req.body[field] || String(req.body[field]).trim().length === 0) {
        return res.status(400).render('auth/signup-donor', {
          pageTitle:    'Register as a Food Donor',
          user:         null,
          errorMessage: `${field} is required`,
          prevData:     req.body,
          pageScripts:  ['/public/js/form-validation.js'],
        });
      }
    }

    // checking password match before hashing
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).render('auth/signup-donor', {
        pageTitle:    'Register as a Food Donor',
        user:         null,
        errorMessage: 'passwords do not match',
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }

    try {
      await createUser({ ...req.body, role: 'donor' });
      return res.redirect('/login');
    } catch (e) {
      return res.status(400).render('auth/signup-donor', {
        pageTitle:    'Register as a Food Donor',
        user:         null,
        errorMessage: e.message,
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }
  });

// ---- distributor signup ----

const distributorRequiredFields = [
  'firstName', 'lastName', 'email', 'phoneNumber',
  'password', 'confirmPassword', 'organizationName', 'einNumber',
  'street', 'city', 'state', 'zipCode',
];

router.route('/signup/distributor')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-distributor', {
      pageTitle:   'Register as a Distributor',
      user:        null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {

    for (const field of distributorRequiredFields) {
      if (!req.body[field] || String(req.body[field]).trim().length === 0) {
        return res.status(400).render('auth/signup-distributor', {
          pageTitle:    'Register as a Distributor',
          user:         null,
          errorMessage: `${field} is required`,
          prevData:     req.body,
          pageScripts:  ['/public/js/form-validation.js'],
        });
      }
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).render('auth/signup-distributor', {
        pageTitle:    'Register as a Distributor',
        user:         null,
        errorMessage: 'passwords do not match',
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }

    try {
      await createUser({ ...req.body, role: 'distributor' });
      return res.redirect('/login');
    } catch (e) {
      return res.status(400).render('auth/signup-distributor', {
        pageTitle:    'Register as a Distributor',
        user:         null,
        errorMessage: e.message,
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }
  });

// ---- volunteer signup ----

const volunteerRequiredFields = [
  'firstName', 'lastName', 'email', 'phoneNumber',
  'password', 'confirmPassword',
  'street', 'city', 'state', 'zipCode',
];

router.route('/signup/volunteer')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-volunteer', {
      pageTitle:   'Register as a Volunteer Courier',
      user:        null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {

    for (const field of volunteerRequiredFields) {
      if (!req.body[field] || String(req.body[field]).trim().length === 0) {
        return res.status(400).render('auth/signup-volunteer', {
          pageTitle:    'Register as a Volunteer Courier',
          user:         null,
          errorMessage: `${field} is required`,
          prevData:     req.body,
          pageScripts:  ['/public/js/form-validation.js'],
        });
      }
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).render('auth/signup-volunteer', {
        pageTitle:    'Register as a Volunteer Courier',
        user:         null,
        errorMessage: 'passwords do not match',
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }

    try {
      await createUser({ ...req.body, role: 'volunteer' });
      return res.redirect('/login');
    } catch (e) {
      return res.status(400).render('auth/signup-volunteer', {
        pageTitle:    'Register as a Volunteer Courier',
        user:         null,
        errorMessage: e.message,
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }
  });

// ---- signout ----

router.route('/signout').get(async (req, res) => {
  // destroying the session asynchronously before redirect
  req.session.destroy((err) => {
    if (err) console.error('session destroy error:', err);
    return res.redirect('/');
  });
});

// ---- notifications ----

router.route('/notifications').get(async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    const notifications = await getNotificationsForUser(req.session.user._id);

    // marking everything as read when the user opens this page
    await markAllAsRead(req.session.user._id);

    const unreadCount = 0;

    return res.render('notifications/index', {
      pageTitle: 'Notifications',
      user:      req.session.user,
      notifications,
      unreadCount,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

export default router;