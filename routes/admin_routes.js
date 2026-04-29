import { Router } from 'express';
import { requireRole } from '../middleware.js';

const router = Router();

// ---- dashboard ----

router.route('/admin/dashboard').get(requireRole('admin'), async (req, res) => {
  try {
    const stats = {
      totalUsers:        0,
      totalListings:     0,
      totalTransactions: 0,
      openComplaints:    0,
    };

    const recentComplaints = [];
    const recentAuditLogs  = [];

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
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- users list ----

router.route('/admin/users').get(requireRole('admin'), async (req, res) => {
  try {
    const users            = [];
    const { role, status } = req.query;

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
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- suspend a user ----

router.route('/admin/users/:id/suspend').post(requireRole('admin'), async (req, res) => {
  try {
    return res.redirect('/admin/users');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- unsuspend a user ----

router.route('/admin/users/:id/unsuspend').post(requireRole('admin'), async (req, res) => {
  try {
    return res.redirect('/admin/users');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- complaints list ----

router.route('/admin/complaints').get(requireRole('admin'), async (req, res) => {
  try {
    const complaints   = [];
    const { status }   = req.query;

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
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- single complaint detail ----

router.route('/admin/complaints/:id').get(requireRole('admin'), async (req, res) => {
  try {
    const complaint = null;

    if (!complaint) {
      return res.status(404).render('error', {
        pageTitle: 'Not Found',
        user: req.session.user,
        error: 'complaint not found',
      });
    }

    return res.render('admin/complaint-detail', {
      pageTitle: 'Review Complaint',
      user:      req.session.user,
      complaint,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- resolve a complaint ----

router.route('/admin/complaints/:id/resolve').post(requireRole('admin'), async (req, res) => {
  try {
    return res.redirect('/admin/complaints');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- audit log ----

router.route('/admin/audit-log').get(requireRole('admin'), async (req, res) => {
  try {
    const auditLogs    = [];
    const { action }   = req.query;

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
      user: req.session.user,
      error: e.message,
    });
  }
});

export default router;