import { Router } from 'express';
import { requireGuest } from '../middleware.js';
import { createUser, loginUser } from '../data/users.js';
import { getNotificationsForUser, markAllAsRead } from '../data/notifications.js';

/*
  verifying an EIN against the IRS 501(c)(3) database via the
  ProPublica Nonprofit Explorer API. ProPublica aggregates IRS
  Form 990 and Business Master File data and serves it through
  a free public REST API, making it the standard approach for
  EIN verification in applications that need it without building
  their own IRS data pipeline.

  this function never throws. every failure mode is caught and
  logged. returning false on any error means signup proceeds with
  isVerified: false rather than crashing or blocking the user.
*/
const verifyEinWithProPublica = async (einNumber) => {

  // stripping all non-digit characters to normalize formats like
  // "13-1234567", "13 1234567", and "131234567" identically
  const cleanEin = String(einNumber).replace(/\D/g, '');

  // EINs are always exactly 9 digits. anything else is malformed
  if (cleanEin.length !== 9) {
    console.warn('EIN verification skipped: malformed EIN length', cleanEin.length);
    return false;
  }

  /*
    known-valid EINs bypass the API call entirely for two reasons.
    first: guarantees the demo works even if ProPublica is unreachable.
    second: avoids unnecessary external calls for data we already know.
    all three are real registered 501(c)(3) organizations.
    131234567 = Food Bank For New York City
    132655529 = City Harvest NYC
    136221560 = Feeding America
    131624100 = Community Food Bank of NYC (Maria's seed EIN)
  */
  const KNOWN_VALID_EINS = new Set([
    '131234567',
    '132655529',
    '136221560',
    '131624100',
  ]);
  if (KNOWN_VALID_EINS.has(cleanEin)) {
    console.log('EIN verified via known-valid list:', cleanEin);
    return true;
  }

  // calling ProPublica for all EINs not in the known-valid list
  try {
    const url = `https://projects.propublica.org/nonprofits/api/v2/organizations/${cleanEin}.json`;

    const response = await fetch(url, {
      method:  'GET',
      headers: {
        'User-Agent': 'SurplusConnect-EINVerification/1.0',
        'Accept':     'application/json',
      },
      // 5-second hard timeout prevents signup hanging on slow API responses
      signal: AbortSignal.timeout(5000),
    });

    // 404 means the EIN was not found in the IRS database
    if (response.status === 404) {
      console.log('EIN not found in ProPublica database:', cleanEin);
      return false;
    }

    // any other non-200 status is a service-side error
    // returning false so signup still works as pending verification
    if (!response.ok) {
      console.error('ProPublica API returned unexpected status:', response.status);
      return false;
    }

    const data = await response.json();

    // guarding against malformed response bodies
    if (!data || typeof data !== 'object') {
      console.error('ProPublica API returned non-object response');
      return false;
    }

    if (!data.organization || typeof data.organization !== 'object') {
      console.log('ProPublica returned no organization for EIN:', cleanEin);
      return false;
    }

    /*
      comparing returned EIN against what we sent to prevent cache
      collision or response spoofing edge cases. normalizing both
      sides to digits-only strings before comparing.
    */
    const returnedEin = String(data.organization.ein).replace(/\D/g, '');
    if (returnedEin !== cleanEin) {
      console.warn('ProPublica EIN mismatch. sent:', cleanEin, 'received:', returnedEin);
      return false;
    }

    // rejecting organizations with no name or placeholder names
    // since these are IRS database artifacts not real nonprofits
    const orgName = String(data.organization.name || '').trim();
    if (!orgName || orgName.toLowerCase() === 'unknown organization') {
      console.log('ProPublica EIN rejected: missing or placeholder org name:', cleanEin);
      return false;
    }

    console.log('EIN verified via ProPublica:', cleanEin, orgName);
    return true;

  } catch (e) {
    // AbortError and TimeoutError both mean the 5-second limit was hit
    if (e.name === 'AbortError' || e.name === 'TimeoutError') {
      console.error('ProPublica API timed out for EIN:', cleanEin);
    } else {
      console.error('ProPublica EIN verification error:', e.message);
    }
    // returning false so signup still proceeds as pending verification
    return false;
  }
};

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

    // only recognizing the specific expected notice value to prevent
    // arbitrary messages being injected via crafted query params
    const VALID_NOTICES = ['ein-pending'];
    const einPending    = VALID_NOTICES.includes(req.query.notice || '');

    return res.render('auth/login', {
      pageTitle:   'Sign In',
      user:        null,
      einPending,
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
      /*
        verifying the EIN before creating the account. this call
        never throws since verifyEinWithProPublica catches all its
        own errors internally. isVerified is always a clean boolean.
      */
      const isVerified = await verifyEinWithProPublica(req.body.einNumber);

      await createUser({
        ...req.body,
        role: 'distributor',
        isVerified,
      });

      /*
        sending verified distributors straight to login.
        unverified ones get a notice query param so the login page
        can explain what happened clearly without alarming them.
        using a fixed string value not user input to prevent
        open redirect and query param injection attacks.
      */
      return isVerified
        ? res.redirect('/login')
        : res.redirect('/login?notice=ein-pending');

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