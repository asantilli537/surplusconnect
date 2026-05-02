import { Router } from 'express';
import { requireRole } from '../middleware.js';
import {
  createListing,
  getListingsByDonor,
  getListingById,
  updateListing,
  deleteListing,
} from '../data/listings.js';
import { transactionsCollection } from '../config/mongoCollections.js';
import { getReceiptById, getReceiptsByDonor } from '../data/receipts.js';

const router = Router();

// ---- dashboard ----

router.route('/donor/dashboard').get(requireRole('donor'), async (req, res) => {
  try {
    const allListings = await getListingsByDonor(req.session.user._id);

    const activeListings  = allListings.filter((l) => l.status === 'active');
    const recentDonations = allListings.filter((l) => l.status !== 'active').slice(0, 5);

    // fetching transaction IDs for claimed listings so donors can access the chat
    const txCol = await transactionsCollection();
    const claimedWithTx = [];

    for (const listing of recentDonations) {
      if (listing.status === 'claimed') {
        const tx = await txCol.findOne({ listingId: listing._id.toString() });
        claimedWithTx.push({
          ...listing,
          _id:           listing._id,
          transactionId: tx ? tx._id.toString() : null,
        });
      } else {
        claimedWithTx.push(listing);
      }
    }

    return res.render('donor/dashboard', {
      pageTitle:          'My Dashboard',
      user:               req.session.user,
      activeListings,
      recentDonations:    claimedWithTx,
      hasActiveListings:  activeListings.length > 0,
      hasRecentDonations: claimedWithTx.length > 0,
      totalDonations:     allListings.filter((l) => l.status === 'delivered').length,
      activeCount:        activeListings.length,
      claimedCount:       allListings.filter((l) => l.status === 'claimed').length,
      pageScripts:        ['/public/js/listing-timer.js'],
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- create listing ----

const listingRequiredFields = [
  'title', 'foodCategory', 'pickupStartTime',
  'pickupEndTime', 'expirationTime',
  'street', 'city', 'state', 'zipCode',
];

router.route('/listings/create')
  .get(requireRole('donor'), async (req, res) => {
    return res.render('donor/listing-create', {
      pageTitle:   'Post a Listing',
      user:        req.session.user,
      pageScripts: ['/public/js/form-validation.js'],
    });
  })
  .post(requireRole('donor'), async (req, res) => {

    // route-level presence check before calling data function
    for (const field of listingRequiredFields) {
      if (!req.body[field] || String(req.body[field]).trim().length === 0) {
        return res.status(400).render('donor/listing-create', {
          pageTitle:    'Post a Listing',
          user:         req.session.user,
          errorMessage: `${field} is required`,
          prevData:     req.body,
          pageScripts:  ['/public/js/form-validation.js'],
        });
      }
    }

    /*
      parsing the items array from the form. express urlencoded
      gives us items[0][name], items[0][quantity] etc as flat keys.
      we rebuild them into an array of objects here before passing
      to the data function.
    */
    // express urlencoded with extended:true already parses bracket
    // notation into a nested array so req.body.items is ready to use
    const rawItems = req.body.items;
    const items = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : [];

    if (items.length === 0) {
      return res.status(400).render('donor/listing-create', {
        pageTitle:    'Post a Listing',
        user:         req.session.user,
        errorMessage: 'at least one food item is required',
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }

    try {
      await createListing(req.session.user._id, { ...req.body, items });
      return res.redirect('/donor/dashboard');
    } catch (e) {
      return res.status(400).render('donor/listing-create', {
        pageTitle:    'Post a Listing',
        user:         req.session.user,
        errorMessage: e.message,
        prevData:     req.body,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }
  });

// ---- edit listing ----

router.route('/listings/:id/edit')
  .get(requireRole('donor'), async (req, res) => {
    try {
      const listing = await getListingById(req.params.id);

      // making sure this donor owns the listing before showing the form
      if (listing.donorId !== req.session.user._id) {
        return res.status(403).render('error', {
          pageTitle: 'Forbidden',
          user:      req.session.user,
          status:    403,
          error:     'you do not have permission to edit this listing',
        });
      }

      if (listing.status !== 'active') {
        return res.status(400).render('error', {
          pageTitle: 'Cannot Edit',
          user:      req.session.user,
          error:     'only active listings can be edited',
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
        user:      req.session.user,
        error:     e.message,
      });
    }
  })
  .post(requireRole('donor'), async (req, res) => {
    try {
      await updateListing(req.params.id, req.session.user._id, req.body);
      return res.redirect('/donor/dashboard');
    } catch (e) {
      // trying to reload the listing for the form repopulation
      let listing = null;
      try { listing = await getListingById(req.params.id); } catch (_) {}

      return res.status(400).render('donor/listing-edit', {
        pageTitle:    'Edit Listing',
        user:         req.session.user,
        listing:      listing || req.body,
        errorMessage: e.message,
        pageScripts:  ['/public/js/form-validation.js'],
      });
    }
  });

// ---- delete listing ----

router.route('/listings/:id/delete').post(requireRole('donor'), async (req, res) => {
  try {
    await deleteListing(req.params.id, req.session.user._id);
    return res.redirect('/donor/dashboard');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- donation history ----

router.route('/donor/history').get(requireRole('donor'), async (req, res) => {
  try {
    const allListings   = await getListingsByDonor(req.session.user._id);
    const pastDonations = allListings.filter((l) => l.status !== 'active');

    // fetching receipts so the view can show view receipt links
    const receipts    = await getReceiptsByDonor(req.session.user._id);
    const receiptMap  = {};
    for (const receipt of receipts) {
      receiptMap[receipt.listingId] = receipt._id.toString();
    }

    // attaching the receipt ID to each delivered listing
    const donationsWithReceipts = pastDonations.map((listing) => ({
      ...listing,
      receiptId: receiptMap[listing._id.toString()] || null,
    }));

    return res.render('donor/listing-history', {
      pageTitle:        'My Donation History',
      user:             req.session.user,
      pastDonations:    donationsWithReceipts,
      hasPastDonations: donationsWithReceipts.length > 0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- view receipt ----

/*
  fetching the receipt and verifying the requesting donor actually
  owns it before rendering. an admin or another donor should never
  be able to view someone else's receipt.
*/
router.route('/receipts/:id').get(requireRole('donor'), async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id);

    // verifying the donor owns this receipt before showing it
    if (receipt.donorId !== req.session.user._id) {
      return res.status(403).render('error', {
        pageTitle: 'Forbidden',
        user:      req.session.user,
        status:    403,
        error:     'you do not have permission to view this receipt',
      });
    }

    return res.render('donor/receipt-detail', {
      pageTitle: `Receipt ${receipt.receiptNumber}`,
      user:      req.session.user,
      receipt,
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

export default router;