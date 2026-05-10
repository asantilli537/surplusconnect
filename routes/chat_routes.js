import { Router } from "express";
import { requireLogin } from "../middleware.js";
import { getThread, addMessage, getMessagesSince } from "../data/messages.js";
import xss from "xss";

const router = Router();

/*
  chat routes handle the real-time messaging feature between donors
  and distributors for a specific transaction. all three routes use
  requireLogin instead of requireRole because both donors and
  distributors need access to the same thread.

  the send and poll routes are AJAX endpoints - they return JSON
  instead of rendering a view. chat.js on the client calls these
  with fetch() to send and receive messages without page reloads.
*/

// ---- chat thread view ----

router.route("/chat/:transactionId").get(requireLogin, async (req, res) => {
  try {
    const { transactionId } = req.params;

    let thread;
    try {
      thread = await getThread(transactionId);
    } catch (e) {
      thread = {
        transactionId,
        isReadOnly: false,
        messages: [],
      };
    }

    // admins always see threads in read-only mode
    // since they should observe but never participate in conversations
    const isAdmin = req.session.user.role === "admin";
    const isReadOnly = thread.isReadOnly || isAdmin;

    return res.render("chat/thread", {
      pageTitle: "Chat",
      user: req.session.user,
      thread: { ...thread, isReadOnly },
      pageScripts: ["/public/js/chat.js"],
    });
  } catch (e) {
    return res.status(500).render("error", {
      pageTitle: "Error",
      user: req.session.user,
      error: e.message,
    });
  }
});

// ---- send a message (AJAX endpoint) ----

/*
  called by chat.js using fetch() POST. returns JSON so the
  client can append the new message bubble without reloading.
  this is the AJAX form submission the course requires.
*/
router
  .route("/chat/:transactionId/send")
  .post(requireLogin, async (req, res) => {
    try {
      const transactionId = xss(req.params.transactionId);
      const { content } = req.body;

      // route-level content check before calling data function
      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0
      ) {
        return res.status(400).json({ error: "message content is required" });
      }

      if (content.trim().length > 1000) {
        return res
          .status(400)
          .json({ error: "message cannot exceed 1000 characters" });
      }

      const cleanContent = xss(content.trim());

      // building sender name from session, not from req.body
      // so users can't spoof someone else's name
      const senderName = `${req.session.user.firstName} ${req.session.user.lastName}`;

      const newMessage = await addMessage(
        transactionId,
        req.session.user._id,
        senderName,
        cleanContent,
      );

      return res.status(200).json({ message: newMessage });
    } catch (e) {
      // catching things like thread locked or thread not found
      // and returning them as JSON errors so chat.js can display them
      return res.status(500).json({ error: e.message });
    }
  });

// ---- poll for new messages (AJAX endpoint) ----

/*
  chat.js calls this every 4 seconds with the timestamp of the
  last message it has seen. the server returns only messages newer
  than that timestamp so we're not re-sending the whole thread
  on every poll.
*/
router
  .route("/chat/:transactionId/poll")
  .get(requireLogin, async (req, res) => {
    try {
      const transactionId = xss(req.params.transactionId);
      const since = req.query.since ? xss(req.query.since) : undefined;

      // since is optional, getMessagesSince handles the missing case
      const newMessages = await getMessagesSince(transactionId, since);
      return res.status(200).json({ messages: newMessages });
    } catch (e) {
      // silently returning empty array on poll errors
      // so the UI doesn't break if a single poll fails
      return res.status(500).json({ error: e.message });
    }
  });

export default router;
