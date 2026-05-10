import { Router } from 'express';
import { requireRole } from '../middleware.js';
import { getUserById } from '../data/users.js';
import {
  getAllActiveListings,
  getListingById,
  claimListing,
  markListingDelivered,
} from '../data/listings.js';
import { transactionsCollection } from '../config/mongoCollections.js';
import { getReceiptByTransaction } from '../data/receipts.js';
import { getAddressById } from '../data/addresses.js';

const router = Router();

// ---- dashboard ----

router.route('/distributor/dashboard').get(requireRole('distributor'), async (req, res) => {
  try {
    const txCol = await transactionsCollection();

    const activeTxs = await txCol
      .find({ distributorId: req.session.user._id, status: 'claimed' })
      .toArray();

    const claimedListings = [];
    for (const tx of activeTxs) {
      try {
        const listing = await getListingById(tx.listingId);
        claimedListings.push({
          ...listing,
          _id:           listing._id.toString(),
          transactionId: tx._id.toString(),
        });
      } catch (e) {
        console.error('failed to load listing for transaction:', e.message);
      }
    }

    const completedTxs = await txCol
      .find({ distributorId: req.session.user._id, status: 'delivered' })
      .sort({ completedAt: -1 })
      .limit(5)
      .toArray();

    const recentPickups = [];
    for (const tx of completedTxs) {
      try {
        const listing = await getListingById(tx.listingId);

        // looking up the real donor name instead of hardcoding 'donor'
        let donorName = 'unknown donor';
        try {
          const donor = await getUserById(listing.donorId);
          donorName = donor.organizationName
            ? donor.organizationName
            : `${donor.firstName} ${donor.lastName}`;
        } catch (e) {
          console.error('donor lookup failed for recent pickup:', e.message);
        }

        recentPickups.push({
          title:       listing.title,
          donorName,
          completedOn: tx.completedAt,
          status:      'delivered',
        });
      } catch (e) {
        console.error('failed to load completed listing:', e.message);
      }
    }

    // reading PIN error state from query params set by the verify-pin redirect
    const pinError          = req.query.pinError   || null;
    const pinErrorListingId = req.query.listingId  || null;

    return res.render('distributor/dashboard', {
      pageTitle:          'Distributor Dashboard',
      user:               req.session.user,
      claimedListings,
      recentPickups,
      hasClaimedListings: claimedListings.length > 0,
      hasRecentPickups:   recentPickups.length > 0,
      totalPickups:       completedTxs.length,
      activeClaimsCount:  claimedListings.length,
      monthPickups:       completedTxs.length,
      pinError,
      pinErrorListingId,
      isVerified: req.session.user.isVerified !== false,
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

    const filters = {};
    if (category && typeof category === 'string' && category.trim().length > 0) {
      filters.category = category.trim();
    }
    if (sort && typeof sort === 'string' && sort.trim().length > 0) {
      filters.sort = sort.trim();
    }

    const activeListings = await getAllActiveListings(filters, req.session.user._id);

    const mapData = activeListings.map(listing => ({
      _id:       listing._id,
      title:     listing.title,
      donorName: listing.donorName,
      latitude:  listing.latitude,
      longitude: listing.longitude
    }));

    return res.render('distributor/listings-browse', {
      pageTitle:      'Browse Listings',
      user:           req.session.user,
      activeListings,
      hasListings:    activeListings.length > 0,
      filterCategory: category || '',
      filterSort:     sort     || 'priority',
      requiresMap:    true,
      listingsJson:   JSON.stringify(mapData),
      pageScripts:    ['/public/js/listings-filter.js', '/public/js/listing-timer.js', '/public/js/map.js'],
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
    const address = await getAddressById(listing.addressId.toString());

    // pickupAddress to display information
    listing.pickupAddress = address;

    let donor = null;
    try {
      donor = await getUserById(listing.donorId);
    } catch (e) {
      console.error('donor lookup failed on listing detail:', e.message);
    }

    return res.render('distributor/listing-detail', {
      pageTitle:   listing.title,
      user:        req.session.user,
      listing,
      donor,
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
    return res.redirect(`/chat/${result.transactionId}`);
  } catch (e) {
    return res.status(400).render('error', {
      pageTitle: 'Cannot Claim',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- verify pickup PIN and mark delivered ----

/*
  the old /transactions/:id/complete route has been removed.
  all deliveries must now go through PIN verification.
  this prevents distributors from marking delivered without
  physically confirming the handoff with the donor.
*/
router.route('/transactions/:id/verify-pin').post(requireRole('distributor'), async (req, res) => {
  try {
    const { listingId, enteredPin } = req.body;

    // checking listingId first since it appears in all error redirects
    if (!listingId || typeof listingId !== 'string' || listingId.trim().length === 0) {
      return res.status(400).render('error', {
        pageTitle: 'Bad Request',
        user:      req.session.user,
        error:     'listing id is required',
      });
    }

    // validating PIN presence before hitting the database
    if (!enteredPin || typeof enteredPin !== 'string' || enteredPin.trim().length === 0) {
      return res.redirect(
        `/distributor/dashboard?pinError=${encodeURIComponent('please enter the pickup PIN')}&listingId=${listingId}`
      );
    }

    // enforcing exactly 4 numeric digits to block padding and injection attempts
    if (!/^\d{4}$/.test(enteredPin.trim())) {
      return res.redirect(
        `/distributor/dashboard?pinError=${encodeURIComponent('PIN must be exactly 4 digits')}&listingId=${listingId}`
      );
    }

    const txCol = await transactionsCollection();
    const tx    = await txCol.findOne({
      listingId:     listingId.trim(),
      distributorId: req.session.user._id,
      status:        'claimed',
    });

    if (!tx) {
      return res.status(404).render('error', {
        pageTitle: 'Not Found',
        user:      req.session.user,
        error:     'transaction not found or already completed',
      });
    }

    // string comparison preserves leading zeros in PINs like 0847
    if (enteredPin.trim() !== tx.pickupPin) {
      return res.redirect(
        `/distributor/dashboard?pinError=${encodeURIComponent('incorrect PIN. please check with the donor.')}&listingId=${listingId}`
      );
    }

    // PIN verified, marking the listing as delivered
    await markListingDelivered(listingId.trim(), req.session.user._id);
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
    const txCol = await transactionsCollection();

    const completedTxs = await txCol
      .find({ distributorId: req.session.user._id, status: 'delivered' })
      .sort({ completedAt: -1 })
      .toArray();

    const pastPickups = [];
    for (const tx of completedTxs) {
      try {
        const listing = await getListingById(tx.listingId);

        let receiptId = null;
        try {
          const receipt = await getReceiptByTransaction(tx._id.toString());
          if (receipt) receiptId = receipt._id.toString();
        } catch (e) {
          // no receipt yet, fine to skip
        }

        // using the top-level getUserById import instead of dynamic import
        let donorName = 'unknown donor';
        try {
          const donor = await getUserById(listing.donorId);
          donorName = donor.organizationName
            ? donor.organizationName
            : `${donor.firstName} ${donor.lastName}`;
        } catch (e) {
          // keeping default if lookup fails
        }

        pastPickups.push({
          _id:          tx._id.toString(),
          title:        listing.title,
          foodCategory: listing.foodCategory,
          itemCount:    listing.items ? listing.items.length : 0,
          donorName,
          createdOn:    tx.claimedAt,
          completedOn:  tx.completedAt,
          status:       'delivered',
          receiptId,
        });
      } catch (e) {
        console.error('failed to load listing for pickup history:', e.message);
      }
    }

    return res.render('distributor/pickup-history', {
      pageTitle:      'Pickup History',
      user:           req.session.user,
      pastPickups,
      hasPastPickups: pastPickups.length > 0,
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