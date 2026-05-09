import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { requireRole, requireLogin } from '../middleware.js';
import {
  createListing,
  getListingsByDonor,
  getListingById,
  updateListing,
  deleteListing,
} from '../data/listings.js';
import { getReceiptById, getReceiptsByDonor } from '../data/receipts.js';
import { listingsCollection, transactionsCollection, usersCollection } from '../config/mongoCollections.js';
import { getAddressByCoordinates, getAddressById } from '../data/addresses.js';

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
          transactionId: tx ? tx._id.toString()  : null,
          pickupPin:     tx ? tx.pickupPin       : null,
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
      const address = await getAddressById(listing.addressId.toString());
      // set address to the listing so we can populate the edit form
      listing.pickupAddress = address;

      // making sure this donor owns the listing before showing the form

      if (listing.donorId.toString() !== req.session.user._id) {
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
router.route('/receipts/:id').get(requireLogin, async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id);

    // both the donor and the distributor involved can view the receipt
    const userId   = req.session.user._id;
    const canView  = receipt.donorId === userId || receipt.distributorId === userId;

    if (!canView) {
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

// ---- donation statistics ----

/*
  aggregating all listing and transaction data for this donor
  to show meaningful impact metrics on the stats dashboard.
  using javascript array methods instead of mongodb aggregation
  pipelines to keep the code readable and consistent with the
  rest of the data layer patterns in this project.
*/
router.route('/donor/stats').get(requireRole('donor'), async (req, res) => {
  try {
    const donorId  = req.session.user._id;
    const listCol  = await listingsCollection();
    const txCol    = await transactionsCollection();
    const userCol  = await usersCollection();

    // fetching all listings for this donor as the base dataset
    const allListings = await listCol
      .find({ donorId: new ObjectId(donorId) })
      .sort({ postedAt: -1 })
      .toArray();

    // ---- overview stats ----

    const totalPosted    = allListings.length;
    const totalDelivered = allListings.filter((l) => l.status === 'delivered').length;
    const totalClaimed   = allListings.filter((l) => l.status === 'claimed').length;
    const totalActive    = allListings.filter((l) => l.status === 'active').length;
    const completionRate = totalPosted > 0
      ? Math.round((totalDelivered / totalPosted) * 100)
      : 0;

    // ---- total food impact ----

    // summing quantities across all items in all delivered listings
    const deliveredListings = allListings.filter((l) => l.status === 'delivered');
    let totalItems = 0;
    for (const listing of deliveredListings) {
      if (Array.isArray(listing.items)) {
        totalItems += listing.items.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0
        );
      }
    }

    // ---- breakdown by food category ----

    const categoryMap = {};
    for (const listing of allListings) {
      const cat = listing.foodCategory || 'other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, posted: 0, delivered: 0 };
      }
      categoryMap[cat].posted++;
      if (listing.status === 'delivered') categoryMap[cat].delivered++;
    }
    const byCategory = Object.values(categoryMap).sort(
      (a, b) => b.delivered - a.delivered
    );

    // ---- monthly trend for the last 6 months ----

    const monthlyMap = {};
    const now = new Date();

    // initializing the last 6 months so months with zero listings still show
    for (let i = 5; i >= 0; i--) {
      const d      = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label  = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap[key] = { label, posted: 0, delivered: 0 };
    }

    for (const listing of allListings) {
      if (!listing.postedAt) continue;
      const d   = new Date(listing.postedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].posted++;
        if (listing.status === 'delivered') monthlyMap[key].delivered++;
      }
    }
    const monthlyTrend = Object.values(monthlyMap);

    // ---- top receiving organizations ----

    // fetching transactions for this donor to find which distributors
    // claimed the most listings. limiting to 5 for the leaderboard.
    const donorTxs = await txCol
      .find({ donorId, status: 'delivered' })
      .toArray();

    const orgMap = {};
    for (const tx of donorTxs) {
      const id = tx.distributorId;
      if (!orgMap[id]) orgMap[id] = { distributorId: id, name: 'unknown', pickups: 0 };
      orgMap[id].pickups++;
    }

    // looking up organization names for each distributor
    for (const entry of Object.values(orgMap)) {
      try {
        const user = await userCol.findOne(
          { _id: new ObjectId(entry.distributorId) },
          { projection: { firstName: 1, lastName: 1, organizationName: 1 } }
        );
        if (user) {
          entry.name = user.organizationName
            ? user.organizationName
            : `${user.firstName} ${user.lastName}`;
        }
      } catch (e) {
        // keeping default name if lookup fails
      }
    }

    const topOrganizations = Object.values(orgMap)
      .sort((a, b) => b.pickups - a.pickups)
      .slice(0, 5);

    return res.render('donor/stats', {
      pageTitle:        'My Donation Statistics',
      user:             req.session.user,
      totalPosted,
      totalDelivered,
      totalClaimed,
      totalActive,
      completionRate,
      totalItems,
      byCategory,
      hasCategories:    byCategory.length > 0,
      monthlyTrend,
      topOrganizations,
      hasTopOrgs:       topOrganizations.length > 0,
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