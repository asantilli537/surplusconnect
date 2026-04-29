import { Router } from 'express';
const router = Router();

/*
  donor routes handle everything a food donor can do on the platform:
  viewing their dashboard, creating listings, editing them, deleting,
  and reviewing their full donation history.
  
  all routes here are protected - a non-donor hitting any of these
  gets redirected out immediately via the role check at the top of
  each handler.
*/

// ---- dashboard ----

router.route('/donor/dashboard').get(async (req, res) => {
  // making sure only donors can reach this
  if (!req.session.user || req.session.user.role !== 'donor') {
    return res.redirect('/login');
  }

  try {
    // placeholder data until data functions are wired in
    const activeListings = [];
    const recentDonations = [];

    return res.render('donor/dashboard', {
      pageTitle: 'My Dashboard',
      user: req.session.user,
      activeListings,
      recentDonations,
      hasActiveListings: activeListings.length > 0,
      hasRecentDonations: recentDonations.length > 0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- create listing ----

router.route('/listings/create')
  .get(async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'donor') {
      return res.redirect('/login');
    }

    return res.render('donor/listing-create', {
      pageTitle: 'Post a Listing',
      user: req.session.user,
    });
  })
  .post(async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'donor') {
      return res.redirect('/login');
    }

    try {
      // POST body will be wired to createListing() data function later
      // for now just redirecting back to dashboard
      return res.redirect('/donor/dashboard');
    } catch (e) {
      return res.status(400).render('donor/listing-create', {
        pageTitle: 'Post a Listing',
        user: req.session.user,
        errorMessage: e.message,
        prevData: req.body,
      });
    }
  });

// ---- edit listing ----

router.route('/listings/:id/edit')
  .get(async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'donor') {
      return res.redirect('/login');
    }

    try {
      // pulling listing by id will come from data layer later
      const listing = null;

      if (!listing) {
        return res.status(404).render('error', {
          pageTitle: 'Not Found',
          user: req.session.user,
          error: 'listing not found',
        });
      }

      return res.render('donor/listing-edit', {
        pageTitle: 'Edit Listing',
        user: req.session.user,
        listing,
      });
    } catch (e) {
      return res.status(500).render('error', {
        pageTitle: 'Error',
        user: req.session.user,
        error: e.message,
      });
    }
  })
  .post(async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'donor') {
      return res.redirect('/login');
    }

    try {
      // updateListing() data function wired in later
      return res.redirect('/donor/dashboard');
    } catch (e) {
      return res.status(400).render('donor/listing-edit', {
        pageTitle: 'Edit Listing',
        user: req.session.user,
        errorMessage: e.message,
        prevData: req.body,
      });
    }
  });

// ---- delete listing ----

router.route('/listings/:id/delete').post(async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'donor') {
    return res.redirect('/login');
  }

  try {
    // deleteListing() data function wired in later
    return res.redirect('/donor/dashboard');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- donation history ----

router.route('/donor/history').get(async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'donor') {
    return res.redirect('/login');
  }

  try {
    const pastDonations = [];

    return res.render('donor/listing-history', {
      pageTitle: 'My Donation History',
      user: req.session.user,
      pastDonations,
      hasPastDonations: pastDonations.length > 0,
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