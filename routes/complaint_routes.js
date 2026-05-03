import { Router } from 'express';
import { requireLogin } from '../middleware.js';
import { createComplaint } from '../data/complaints.js';
import { transactionsCollection } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';

const router = Router();

/*
  complaint routes are accessible to both donors and distributors.
  using requireLogin instead of requireRole so either party in a
  transaction can file a complaint without role-specific restrictions.
  validation that the filer is actually involved in the transaction
  is handled inside createComplaint in the data layer.
*/

// ---- show complaint form ----

router.route('/complaints/new').get(requireLogin, async (req, res) => {
  try {
    const { transactionId } = req.query;

    // transactionId is required to scope the complaint to a transaction
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0) {
      return res.status(400).render('error', {
        pageTitle: 'Bad Request',
        user:      req.session.user,
        error:     'a transaction id is required to file a complaint',
      });
    }

    // fetching the transaction to pre-fill hidden form fields
    const txCol = await transactionsCollection();
    let tx;
    try {
      tx = await txCol.findOne({ _id: new ObjectId(transactionId.trim()) });
    } catch (e) {
      return res.status(400).render('error', {
        pageTitle: 'Bad Request',
        user:      req.session.user,
        error:     'invalid transaction id',
      });
    }

    if (!tx) {
      return res.status(404).render('error', {
        pageTitle: 'Not Found',
        user:      req.session.user,
        status:    404,
        error:     'transaction not found',
      });
    }

    // making sure the user filing is actually a party to this transaction
    const userId = req.session.user._id;
    const txDonorId       = String(tx.donorId);
    const txDistributorId = String(tx.distributorId);
    if (userId !== txDonorId && userId !== txDistributorId) {
      return res.status(403).render('error', {
        pageTitle: 'Forbidden',
        user:      req.session.user,
        status:    403,
        error:     'you can only file a complaint about a transaction you are involved in',
      });
    }

    // blocking complaints on already delivered transactions
    // since the dispute window should be while the pickup is active
    if (tx.status === 'cancelled') {
      return res.status(400).render('error', {
        pageTitle: 'Cannot File Complaint',
        user:      req.session.user,
        error:     'complaints cannot be filed on cancelled transactions',
      });
    }

    return res.render('complaint/new', {
      pageTitle:     'File a Complaint',
      user:          req.session.user,
      transactionId: tx._id.toString(),
      listingId:     tx.listingId,
      donorId:       tx.donorId,
      distributorId: tx.distributorId,
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user:      req.session.user,
      error:     e.message,
    });
  }
});

// ---- submit complaint form ----

router.route('/complaints/new').post(requireLogin, async (req, res) => {
  const { transactionId, listingId, donorId, distributorId, complaint } = req.body;

  // route-level presence checks before calling data function
  if (!transactionId || !listingId || !donorId || !distributorId) {
    return res.status(400).render('error', {
      pageTitle: 'Bad Request',
      user:      req.session.user,
      error:     'missing required transaction fields',
    });
  }

  if (!complaint || typeof complaint !== 'string' || complaint.trim().length === 0) {
    return res.status(400).render('complaint/new', {
      pageTitle:     'File a Complaint',
      user:          req.session.user,
      transactionId,
      listingId,
      donorId,
      distributorId,
      errorMessage:  'complaint text is required',
      prevComplaint: complaint || '',
    });
  }

  if (complaint.trim().length < 10) {
    return res.status(400).render('complaint/new', {
      pageTitle:     'File a Complaint',
      user:          req.session.user,
      transactionId,
      listingId,
      donorId,
      distributorId,
      errorMessage:  'please provide more detail, at least 10 characters',
      prevComplaint: complaint,
    });
  }

  try {
    await createComplaint({
      filedById:     req.session.user._id,
      transactionId,
      listingId,
      donorId,
      distributorId,
      complaint:     complaint.trim(),
    });

    // redirecting to the appropriate dashboard after filing
    const role = req.session.user.role;
    if (role === 'donor')       return res.redirect('/donor/dashboard');
    if (role === 'distributor') return res.redirect('/distributor/dashboard');
    return res.redirect('/');
  } catch (e) {
    return res.status(400).render('complaint/new', {
      pageTitle:     'File a Complaint',
      user:          req.session.user,
      transactionId,
      listingId,
      donorId,
      distributorId,
      errorMessage:  e.message,
      prevComplaint: complaint || '',
    });
  }
});

export default router;