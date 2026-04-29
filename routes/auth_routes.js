/*
This file contains all routes relevant for authentication including sign up, sign in, and sign out.
Depending on user role, the sign up forms will contain different fields. Sign up page will be the same for both.
*/

import { Router } from 'express';
const router = Router();

// ---- landing and auth routes ----

router.route('/').get(async (req, res) => {
  // sending logged-in users straight to their dashboard
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

router.route('/login')
  .get(async (req, res) => {
    // already logged in, no need to show login page
    if (req.session.user) return res.redirect('/');

    return res.render('auth/login', {
      pageTitle: 'Sign In',
      user: null,
    });
  })
  .post(async (req, res) => {
    // login POST will be wired to data functions later
    return res.redirect('/');
  });

router.route('/signup')
  .get(async (req, res) => {
    if (req.session.user) return res.redirect('/');

    return res.render('auth/signup-select', {
      pageTitle: 'Create an Account',
      user: null,
    });
  });

router.route('/signup/donor')
  .get(async (req, res) => {
    if (req.session.user) return res.redirect('/');

    return res.render('auth/signup-donor', {
      pageTitle: 'Register as a Food Donor',
      user: null,
    });
  })
  .post(async (req, res) => {
    // donor signup POST wired to data layer later
    return res.redirect('/login');
  });

router.route('/signup/distributor')
  .get(async (req, res) => {
    if (req.session.user) return res.redirect('/');

    return res.render('auth/signup-distributor', {
      pageTitle: 'Register as a Distributor',
      user: null,
    });
  })
  .post(async (req, res) => {
    return res.redirect('/login');
  });

router.route('/signup/volunteer')
  .get(async (req, res) => {
    if (req.session.user) return res.redirect('/');

    return res.render('auth/signup-volunteer', {
      pageTitle: 'Register as a Volunteer Courier',
      user: null,
    });
  })
  .post(async (req, res) => {
    return res.redirect('/login');
  });

router.route('/signout').get(async (req, res) => {
  req.session.destroy();
  return res.redirect('/');
});

export default router;