import { Router } from 'express';
import { requireRole } from '../middleware.js';

const router = Router();

// applying distributor role check to every route in this file
router.use(requireRole('distributor'));

// ---- dashboard ----

router.route('/distributor/dashboard').get(async (req, res) => {
  try {
    const claimedListings = [];
    const recentPickups   = [];

    return res.render('distributor/dashboard', {
      pageTitle:         'Distributor Dashboard',
      user:              req.session.user,
      claimedListings,
      recentPickups,
      hasClaimedListings: claimedListings.length > 0,
      hasRecentPickups:   recentPickups.length > 0,
      totalPickups:       0,
      activeClaimsCount:  0,
      monthPickups:       0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- browse active listings ----

router.route('/listings').get(async (req, res) => {
  try {
    const activeListings        = [];
    const { category, sort }    = req.query;

    return res.render('distributor/listings-browse', {
      pageTitle:      'Browse Listings',
      user:           req.session.user,
      activeListings,
      hasListings:    activeListings.length > 0,
      filterCategory: category || '',
      filterSort:     sort     || 'priority',
      pageScripts:    ['/public/js/listings-filter.js'],
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- single listing detail ----

router.route('/listings/:id').get(async (req, res) => {
  try {
    // getListingById(req.params.id) wired in later
    const listing = null;

    if (!listing) {
      return res.status(404).render('error', {
        pageTitle: 'Not Found',
        user: req.session.user,
        error: 'listing not found',
      });
    }

    return res.render('distributor/listing-detail', {
      pageTitle: listing.title,
      user:      req.session.user,
      listing,
      canClaim:  listing.status === 'active',
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- claim a listing ----

router.route('/listings/:id/claim').post(async (req, res) => {
  try {
    // claimListing(req.params.id, req.session.user._id) wired in later
    // also creates the transaction and opens the chat thread
    return res.redirect(`/listings/${req.params.id}`);
  } catch (e) {
    return res.status(400).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- confirm pickup delivered ----

router.route('/transactions/:id/complete').post(async (req, res) => {
  try {
    // markTransactionComplete(req.params.id) wired in later
    // this triggers receipt generation and locks the chat thread
    return res.redirect('/distributor/dashboard');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- pickup history ----

router.route('/distributor/history').get(async (req, res) => {
  try {
    const pastPickups = [];

    return res.render('distributor/pickup-history', {
      pageTitle:      'Pickup History',
      user:           req.session.user,
      pastPickups,
      hasPastPickups: pastPickups.length > 0,
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