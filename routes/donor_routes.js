import { Router } from 'express';
import { requireRole } from '../middleware.js';

const router = Router();

// ---- dashboard ----

router.route('/donor/dashboard').get(requireRole('donor'), async (req, res) => {
  try {
    const activeListings  = [];
    const recentDonations = [];

    return res.render('donor/dashboard', {
      pageTitle:          'My Dashboard',
      user:               req.session.user,
      activeListings,
      recentDonations,
      hasActiveListings:  activeListings.length > 0,
      hasRecentDonations: recentDonations.length > 0,
      totalDonations:     0,
      activeCount:        0,
      claimedCount:       0,
      pageScripts:        ['/public/js/listing-timer.js'],
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
  .get(requireRole('donor'), async (req, res) => {
    return res.render('donor/listing-create', {
      pageTitle:   'Post a Listing',
      user:        req.session.user,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(requireRole('donor'), async (req, res) => {
    try {
      return res.redirect('/donor/dashboard');
    } catch (e) {
      return res.status(400).render('donor/listing-create', {
        pageTitle:    'Post a Listing',
        user:         req.session.user,
        errorMessage: e.message,
        prevData:     req.body,
      });
    }
  });

// ---- edit listing ----

router.route('/listings/:id/edit')
  .get(requireRole('donor'), async (req, res) => {
    try {
      const listing = null;

      if (!listing) {
        return res.status(404).render('error', {
          pageTitle: 'Not Found',
          user: req.session.user,
          error: 'listing not found',
        });
      }

      return res.render('donor/listing-edit', {
        pageTitle:   'Edit Listing',
        user:        req.session.user,
        listing,
        pageScripts: ['/public/js/form-validation.js'],
      });
    } catch (e) {
      return res.status(500).render('error', {
        pageTitle: 'Error',
        user: req.session.user,
        error: e.message,
      });
    }
  })
  .post(requireRole('donor'), async (req, res) => {
    try {
      return res.redirect('/donor/dashboard');
    } catch (e) {
      return res.status(400).render('donor/listing-edit', {
        pageTitle:    'Edit Listing',
        user:         req.session.user,
        errorMessage: e.message,
        prevData:     req.body,
      });
    }
  });

// ---- delete listing ----

router.route('/listings/:id/delete').post(requireRole('donor'), async (req, res) => {
  try {
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

router.route('/donor/history').get(requireRole('donor'), async (req, res) => {
  try {
    const pastDonations = [];

    return res.render('donor/listing-history', {
      pageTitle:        'My Donation History',
      user:             req.session.user,
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