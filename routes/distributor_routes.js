import { Router } from 'express';
import { requireRole } from '../middleware.js';
import {
  getAllActiveListings,
  getListingById,
  claimListing,
  markListingDelivered,
} from '../data/listings.js';

const router = Router();

// ---- dashboard ----

router.route('/distributor/dashboard').get(requireRole('distributor'), async (req, res) => {
  try {
    return res.render('distributor/dashboard', {
      pageTitle:          'Distributor Dashboard',
      user:               req.session.user,
      claimedListings:    [],
      recentPickups:      [],
      hasClaimedListings: false,
      hasRecentPickups:   false,
      totalPickups:       0,
      activeClaimsCount:  0,
      monthPickups:       0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- browse active listings ----

router.route('/listings').get(requireRole('distributor'), async (req, res) => {
  try {
    const { category, sort } = req.query;

    // only passing defined non-empty filter values to the data function
    const filters = {};
    if (category && typeof category === 'string' && category.trim().length > 0) {
      filters.category = category.trim();
    }
    if (sort && typeof sort === 'string' && sort.trim().length > 0) {
      filters.sort = sort.trim();
    }

    const activeListings = await getAllActiveListings(filters);

    return res.render('distributor/listings-browse', {
      pageTitle:      'Browse Listings',
      user:           req.session.user,
      activeListings,
      hasListings:    activeListings.length > 0,
      filterCategory: category || '',
      filterSort:     sort     || 'priority',
      pageScripts:    ['/public/js/listings-filter.js', '/public/js/listing-timer.js'],
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- single listing detail ----

router.route('/listings/:id').get(requireRole('distributor'), async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);

    return res.render('distributor/listing-detail', {
      pageTitle:   listing.title,
      user:        req.session.user,
      listing,
      canClaim:    listing.status === 'active',
      pageScripts: ['/public/js/listing-timer.js'],
    });
  } catch (e) {
    return res.status(404).render('error', {
      pageTitle: 'Not Found',
      user:      req.session.user,
      status:    404,
      error:     e.message,
    });
  }
});

// ---- claim a listing ----

router.route('/listings/:id/claim').post(requireRole('distributor'), async (req, res) => {
  try {
    const result = await claimListing(req.params.id, req.session.user._id);

    // redirecting to the chat thread that was opened when claiming
    return res.redirect(`/chat/${result.transactionId}`);
  } catch (e) {
    return res.status(400).render('error', {
      pageTitle: 'Cannot Claim',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- confirm pickup delivered ----

/*
  note: this route currently receives the listingId as the param.
  when transaction data is fully wired this will use transactionId
  and call a transaction-level function instead.
*/
router.route('/transactions/:id/complete').post(requireRole('distributor'), async (req, res) => {
  try {
    await markListingDelivered(req.params.id, req.session.user._id);
    return res.redirect('/distributor/dashboard');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- pickup history ----

router.route('/distributor/history').get(requireRole('distributor'), async (req, res) => {
  try {
    return res.render('distributor/pickup-history', {
      pageTitle:      'Pickup History',
      user:           req.session.user,
      pastPickups:    [],
      hasPastPickups: false,
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