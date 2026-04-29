import { Router } from 'express';
import { requireLogin } from '../middleware.js';

const router = Router();

/*
  chat is accessible to donors, distributors, and admins.
  using requireLogin per route instead of router.use so unknown
  URLs can fall through to the 404 handler correctly.
*/

// ---- view a chat thread ----

router.route('/chat/:transactionId').get(requireLogin, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const thread = {
      transactionId,
      isReadOnly: false,
      messages:   [],
    };

    return res.render('chat/thread', {
      pageTitle:   'Chat',
      user:        req.session.user,
      thread,
      pageScripts: ['/public/js/chat.js'],
    });
  } catch (e) {
    return res.status(500).render('error', {
      pageTitle: 'Error',
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- send a message (AJAX endpoint) ----

router.route('/chat/:transactionId/send').post(requireLogin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { content }       = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'message content is required' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ error: 'message is too long' });
    }

    // addMessage() wired in later
    const newMessage = {
      _id:        Date.now().toString(),
      senderId:   req.session.user._id,
      senderName: `${req.session.user.firstName} ${req.session.user.lastName}`,
      content:    content.trim(),
      timestamp:  new Date().toISOString(),
    };

    return res.status(200).json({ message: newMessage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ---- poll for new messages (AJAX endpoint) ----

router.route('/chat/:transactionId/poll').get(requireLogin, async (req, res) => {
  try {
    const newMessages = [];
    return res.status(200).json({ messages: newMessages });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;