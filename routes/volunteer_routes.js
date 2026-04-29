import { Router } from 'express';
import { requireRole } from '../middleware.js';
const router = Router();

router.use(requireRole('volunteer'));

router.route('/volunteer/dashboard').get(async (req, res) => {
  try {
    const assignedPickups   = [];
    const completedPickups  = [];

    return res.render('volunteer/dashboard', {
      pageTitle:            'My Assignments',
      user:                 req.session.user,
      assignedPickups,
      completedPickups,
      hasAssigned:          assignedPickups.length > 0,
      hasCompleted:         completedPickups.length > 0,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

router.route('/volunteer/pickups/:id/complete').post(async (req, res) => {
  try {
    // markPickupComplete(req.params.id) wired in later
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