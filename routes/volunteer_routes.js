
import { Router } from 'express';
import { requireRole } from '../middleware.js';
import { getAllActiveListings } from '../data/listings.js';

const router = Router();

// ---- dashboard ----

router.route('/volunteer/dashboard').get(requireRole('volunteer'), async (req, res) => {
  try {
    // fetching active listings so the volunteer can see what food
    // is currently available in the area even without assignments
    const activeListings = await getAllActiveListings({});

    return res.render('volunteer/dashboard', {
      pageTitle:       'Volunteer Dashboard',
      user:            req.session.user,
      assignedPickups: [],
      completedPickups: [],
      hasAssigned:     false,
      hasCompleted:    false,
      hasActiveListings: activeListings.length > 0,
      activeListings,
      pageScripts:     ['/public/js/listing-timer.js'],
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
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
      user:      req.session.user,
      error:     e.message,
    });
  }
});

export default router;
