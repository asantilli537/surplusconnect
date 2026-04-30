import { Router } from 'express';
import { requireRole } from '../middleware.js';

const router = Router();

// ---- dashboard ----

router.route('/volunteer/dashboard').get(requireRole('volunteer'), async (req, res) => {
  try {
    const assignedPickups  = [];
    const completedPickups = [];

    return res.render('volunteer/dashboard', {
      pageTitle:    'My Assignments',
      user:         req.session.user,
      assignedPickups,
      completedPickups,
      hasAssigned:  assignedPickups.length > 0,
      hasCompleted: completedPickups.length > 0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- mark pickup complete ----

router.route('/volunteer/pickups/:id/complete').post(requireRole('volunteer'), async (req, res) => {
  try {
    return res.redirect('/volunteer/dashboard');
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

export default router;