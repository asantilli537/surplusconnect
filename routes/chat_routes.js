import { Router } from 'express';
import { requireLogin } from '../middleware.js';
const router = Router();

// chat is accessible to donors, distributors, and admins
// so we use requireLogin instead of requireRole here
router.use(requireLogin);

// ---- view a chat thread ----

router.route('/chat/:transactionId').get(async (req, res) => {
  try {
    const { transactionId } = req.params;

    // getMessageThread(transactionId) wired in later
    // for now passing empty thread so the view renders
    const thread = {
      transactionId,
      isReadOnly:   false,
      messages:     [],
    };

    return res.render('chat/thread', {
      pageTitle:  'Chat',
      user:       req.session.user,
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

/*
  this route is called by chat.js using fetch() instead of a form POST.
  it responds with JSON so the client can append the new message to the
  thread without reloading the page. this is the AJAX submission the
  course requires.
*/
router.route('/chat/:transactionId/send').post(async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { content }       = req.body;

    // validating that message content was actually sent
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'message content is required' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ error: 'message is too long' });
    }

    // addMessage(transactionId, req.session.user._id, content) wired in later
    const newMessage = {
      _id:       Date.now().toString(),
      senderId:  req.session.user._id,
      senderName: `${req.session.user.firstName} ${req.session.user.lastName}`,
      content:   content.trim(),
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json({ message: newMessage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ---- poll for new messages (AJAX endpoint) ----

/*
  called by chat.js on an interval to check for new messages.
  the client sends the timestamp of its most recent message and
  the server returns anything newer than that.
*/
router.route('/chat/:transactionId/poll').get(async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { since }         = req.query;

    // getMessagesSince(transactionId, since) wired in later
    const newMessages = [];

    return res.status(200).json({ messages: newMessages });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;