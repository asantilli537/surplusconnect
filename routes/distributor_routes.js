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

const router = Router();

// ---- dashboard ----

router.route('/distributor/dashboard').get(requireRole('distributor'), async (req, res) => {
  try {
    const txCol = await transactionsCollection();

    // getting all active claims for this distributor
    const activeTxs = await txCol
      .find({
        distributorId: req.session.user._id,
        status:        'claimed',
      })
      .toArray();

    // fetching the listing document for each active transaction
    const claimedListings = [];
    for (const tx of activeTxs) {
      try {
        const listing = await getListingById(tx.listingId);
        // attaching the transactionId so the view can link to the chat
        claimedListings.push({ ...listing, transactionId: tx._id.toString() });
      } catch (e) {
        // skipping listings that can't be found
        console.error('failed to load listing for transaction:', e.message);
      }
    }

    // getting completed pickups for the recent section
    const completedTxs = await txCol
      .find({
        distributorId: req.session.user._id,
        status:        'delivered',
      })
      .sort({ completedAt: -1 })
      .limit(5)
      .toArray();

    const recentPickups = [];
    for (const tx of completedTxs) {
      try {
        const listing = await getListingById(tx.listingId);
        recentPickups.push({
          title:       listing.title,
          donorName:   'donor',
          completedOn: tx.completedAt,
          status:      'delivered',
        });
      } catch (e) {
        console.error('failed to load completed listing:', e.message);
      }
    }

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

      // fetching donor info to show in the about section
      let donor = null;
      try {
        donor = await getUserById(listing.donorId);
      } catch (e) {
        // not crashing the page if donor lookup fails
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
    const txCol = await transactionsCollection();

    const completedTxs = await txCol
      .find({
        distributorId: req.session.user._id,
        status:        'delivered',
      })
      .sort({ completedAt: -1 })
      .toArray();

    const pastPickups = [];
    for (const tx of completedTxs) {
      try {
        const listing = await getListingById(tx.listingId);

        // fetching receipt for this transaction if one exists
        let receiptId = null;
        try {
          const receipt = await getReceiptByTransaction(tx._id.toString());
          if (receipt) receiptId = receipt._id.toString();
        } catch (e) {
          // no receipt yet, that is fine
        }

        // fetching donor name to display in the table
        let donorName = 'unknown donor';
        try {
          const { getUserById } = await import('../data/users.js');
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