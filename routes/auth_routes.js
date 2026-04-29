/*
This file contains all routes relevant for authentication including sign up, sign in, and sign out.
Depending on user role, the sign up forms will contain different fields. Sign up page will be the same for both.
*/

import { Router } from 'express';
import { requireGuest } from '../middleware.js';

const router = Router();

// ---- landing page ----

router.route('/').get(async (req, res) => {
  if (req.session.user) {
    const role = req.session.user.role;
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
      pageTitle: 'Sign In',
      user: null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {
    // login POST wired to data functions later
    return res.redirect('/');
  });

// ---- role selection ----

router.route('/signup')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-select', {
      pageTitle: 'Create an Account',
      user: null,
    });
  });

// ---- donor signup ----

router.route('/signup/donor')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-donor', {
      pageTitle: 'Register as a Food Donor',
      user: null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {
    return res.redirect('/login');
  });

// ---- distributor signup ----

router.route('/signup/distributor')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-distributor', {
      pageTitle: 'Register as a Distributor',
      user: null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {
    return res.redirect('/login');
  });

// ---- volunteer signup ----

router.route('/signup/volunteer')
  .get(requireGuest, async (req, res) => {
    return res.render('auth/signup-volunteer', {
      pageTitle: 'Register as a Volunteer Courier',
      user: null,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(async (req, res) => {
    return res.redirect('/login');
  });

// ---- signout ----

router.route('/signout').get(async (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('session destroy error:', err);
    return res.redirect('/');
  });
});

// ---- notifications ----

router.route('/notifications').get(async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    const notifications = [];

    return res.render('notifications/index', {
      pageTitle:     'Notifications',
      user:          req.session.user,
      notifications,
      unreadCount:   0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

export default router;