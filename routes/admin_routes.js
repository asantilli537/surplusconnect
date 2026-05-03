import { Router } from 'express';
import { requireRole } from '../middleware.js';
import { getAllUsers, suspendUser, unsuspendUser } from '../data/users.js';
import {
  getAllComplaints,
  getComplaintById,
  resolveComplaint,
} from '../data/complaints.js';
import { getAllAuditLogs, getRecentAuditLogs } from '../data/auditLogs.js';
import {
  usersCollection,
  listingsCollection,
  transactionsCollection,
  complaintsCollection,
} from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';

const router = Router();

/*
  admin routes handle platform oversight. every route here is
  restricted to the admin role via requireRole applied per route.
  admins can view all users, manage complaints, suspend accounts,
  and review the full audit log of admin actions.
*/

// ---- dashboard ----

router.route('/admin/dashboard').get(requireRole('admin'), async (req, res) => {
  try {
    const userCol      = await usersCollection();
    const listingCol   = await listingsCollection();
    const txCol        = await transactionsCollection();
    const complaintCol = await complaintsCollection();

    // running each count with the async/await pattern taught in class
    const totalUsers        = await userCol.countDocuments({});
    const totalListings     = await listingCol.countDocuments({});
    const totalTransactions = await txCol.countDocuments({});

    // only counting unresolved complaints for the alert stat card
    const openComplaints = await complaintCol.countDocuments({ isResolved: false });

    // pulling recent items for the preview sections on the dashboard
    const allOpenComplaints = await getAllComplaints({});
    const recentComplaints  = allOpenComplaints.slice(0, 5);
    const recentAuditLogs   = await getRecentAuditLogs(5);

    const stats = {
      totalUsers,
      totalListings,
      totalTransactions,
      openComplaints,
    };

    return res.render('admin/dashboard', {
      pageTitle:           'Admin Dashboard',
      user:                req.session.user,
      stats,
      recentComplaints,
      recentAuditLogs,
      hasRecentComplaints: recentComplaints.length > 0,
      hasRecentLogs:       recentAuditLogs.length > 0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- users list ----

router.route('/admin/users').get(requireRole('admin'), async (req, res) => {
  try {
    const { role, status } = req.query;

    // building filters from query params, ignoring empty or missing values
    const filters = {};
    if (role   && typeof role   === 'string' && role.trim().length > 0)   filters.role   = role.trim();
    if (status && typeof status === 'string' && status.trim().length > 0) filters.status = status.trim();

    const users = await getAllUsers(filters);

    return res.render('admin/users', {
      pageTitle:    'Manage Users',
      user:         req.session.user,
      users,
      hasUsers:     users.length > 0,
      filterRole:   role   || '',
      filterStatus: status || '',
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- suspend a user ----

/*
  suspendUser in data/users.js handles all validation including
  preventing an admin from suspending their own account or another admin.
  it also writes to the audit log automatically.
*/
router.route('/admin/users/:id/suspend').post(requireRole('admin'), async (req, res) => {
  try {
    await suspendUser(req.params.id, req.session.user._id);
    return res.redirect('/admin/users');
  } catch (e) {
    return res.status(400).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- unsuspend a user ----

router.route('/admin/users/:id/unsuspend').post(requireRole('admin'), async (req, res) => {
  try {
    await unsuspendUser(req.params.id, req.session.user._id);
    return res.redirect('/admin/users');
  } catch (e) {
    return res.status(400).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- complaints list ----

router.route('/admin/complaints').get(requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    const filters = {};
    if (status && typeof status === 'string' && status.trim().length > 0) {
      filters.status = status.trim();
    }

    const complaints = await getAllComplaints(filters);

    return res.render('admin/complaints', {
      pageTitle:     'Complaints',
      user:          req.session.user,
      complaints,
      hasComplaints: complaints.length > 0,
      filterStatus:  status || '',
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- single complaint detail ----

router.route('/admin/complaints/:id').get(requireRole('admin'), async (req, res) => {
  try {
    const complaint = await getComplaintById(req.params.id);

    // fetching donor and distributor names to display instead of raw IDs
    const userCol = await usersCollection();

    let donorName       = complaint.donorId;
    let distributorName = complaint.distributorId;

    try {
      const donor = await userCol.findOne(
        { _id: new ObjectId(complaint.donorId) },
        { projection: { firstName: 1, lastName: 1, organizationName: 1 } }
      );
      if (donor) {
        donorName = donor.organizationName
          ? `${donor.firstName} ${donor.lastName} (${donor.organizationName})`
          : `${donor.firstName} ${donor.lastName}`;
      }
    } catch (e) {
      // keeping the raw ID if lookup fails
    }

    try {
      const distributor = await userCol.findOne(
        { _id: new ObjectId(complaint.distributorId) },
        { projection: { firstName: 1, lastName: 1, organizationName: 1 } }
      );
      if (distributor) {
        distributorName = distributor.organizationName
          ? `${distributor.firstName} ${distributor.lastName} (${distributor.organizationName})`
          : `${distributor.firstName} ${distributor.lastName}`;
      }
    } catch (e) {
      // keeping the raw ID if lookup fails
    }

    return res.render('admin/complaint-detail', {
      pageTitle:       'Review Complaint',
      user:            req.session.user,
      complaint,
      donorName,
      distributorName,
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

// ---- resolve a complaint ----

router.route('/admin/complaints/:id/resolve').post(requireRole('admin'), async (req, res) => {
  try {
    await resolveComplaint(req.params.id, req.session.user._id);
    return res.redirect('/admin/complaints');
  } catch (e) {
    return res.status(400).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- audit log ----

router.route('/admin/audit-log').get(requireRole('admin'), async (req, res) => {
  try {
    const { action } = req.query;

    const filters = {};
    if (action && typeof action === 'string' && action.trim().length > 0) {
      filters.action = action.trim();
    }

    const auditLogs = await getAllAuditLogs(filters);

    return res.render('admin/audit-log', {
      pageTitle:    'Audit Log',
      user:         req.session.user,
      auditLogs,
      hasLogs:      auditLogs.length > 0,
      filterAction: action || '',
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