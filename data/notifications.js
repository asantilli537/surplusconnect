import { ObjectId } from 'mongodb';
import { notificationsCollection } from '../config/mongoCollections.js';
import * as h from '../helpers.js';

/*
  notifications are created by the system whenever something meaningful
  happens: a listing gets claimed, a pickup is scheduled, a receipt is
  generated, etc. users see them in the notification bell on the navbar.
*/

// valid notification types so we're not storing arbitrary strings
const validTypes = [
  'listing_claimed',
  'pickup_scheduled',
  'pickup_confirmed',
  'listing_expired',
  'receipt_generated',
  'new_listing_nearby',
  'account_suspended',
  'complaint_resolved',
];

// ---- createNotification ----

/*
  called internally by other data functions whenever an event
  occurs that the user needs to know about. never called directly
  from a route handler.
*/
export const createNotification = async (userId, type, message) => {

  /* Input Validation */
  const cleanUserId = h.checkAndThrowId(String(userId), 'userId');

  if (!type || typeof type !== 'string' || !validTypes.includes(type.trim())) {
    throw new Error(`notification type must be one of: ${validTypes.join(', ')}`);
  }

  const cleanMessage = h.checkAndThrowString(message, 'message', 1, 500);
  const safeMessage  = h.sanitize(cleanMessage);

  const notifications = await notificationsCollection();

  const newNotification = {
    userId:   cleanUserId,
    type:     type.trim(),
    message:  safeMessage,
    isRead:   false,
    sentTime: new Date().toISOString(),
  };

  const result = await notifications.insertOne(newNotification);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error('failed to create notification');
  }

  return {
    _id:      result.insertedId.toString(),
    userId:   cleanUserId,
    type:     type.trim(),
    message:  safeMessage,
    isRead:   false,
    sentTime: newNotification.sentTime,
  };
};

// ---- getNotificationsForUser ----

/*
  returns all notifications for a user, newest first.
  used by the notifications page and the navbar bell count.
*/
export const getNotificationsForUser = async (userId) => {

  /* Input Validation */
  const cleanUserId = h.checkAndThrowId(String(userId), 'userId');

  const notifications = await notificationsCollection();

  const userNotifications = await notifications
    .find({ userId: cleanUserId })
    .sort({ sentTime: -1 })
    .toArray();

  return userNotifications;
};

// ---- getUnreadCount ----

/*
  used by the navbar to show the unread badge number.
  only counting unread ones so we're not pulling the full
  list on every single page load.
*/
export const getUnreadCount = async (userId) => {

  /* Input Validation */
  const cleanUserId = h.checkAndThrowId(String(userId), 'userId');

  const notifications = await notificationsCollection();

  const count = await notifications.countDocuments({
    userId: cleanUserId,
    isRead: false,
  });

  return count;
};

// ---- markAsRead ----

/*
  marks a single notification as read when the user views it.
  checking that the notification belongs to the requesting user
  so one user can't mark another user's notifications as read.
*/
export const markAsRead = async (notificationId, userId) => {

  /* Input Validation */
  const cleanNotifId = h.checkAndThrowId(String(notificationId), 'notificationId');
  const cleanUserId  = h.checkAndThrowId(String(userId),          'userId');

  const notifications = await notificationsCollection();

  const notif = await notifications.findOne({
    _id: new ObjectId(cleanNotifId),
  });

  if (!notif) throw new Error('notification not found');

  // making sure users can only mark their own notifications as read
  if (notif.userId !== cleanUserId) {
    throw new Error('you do not have permission to modify this notification');
  }

  if (notif.isRead) return { alreadyRead: true };

  const result = await notifications.updateOne(
    { _id: new ObjectId(cleanNotifId) },
    { $set: { isRead: true, readAt: new Date().toISOString() } }
  );

  if (result.modifiedCount === 0) {
    throw new Error('failed to mark notification as read');
  }

  return { marked: true, notificationId: cleanNotifId };
};

// ---- markAllAsRead ----

/*
  marks every unread notification as read for a user at once.
  called when the user opens the notifications page so everything
  clears in one operation instead of one request per notification.
*/
export const markAllAsRead = async (userId) => {

  /* Input Validation */
  const cleanUserId = h.checkAndThrowId(String(userId), 'userId');

  const notifications = await notificationsCollection();

  const result = await notifications.updateMany(
    { userId: cleanUserId, isRead: false },
    { $set: { isRead: true, readAt: new Date().toISOString() } }
  );

  return { marked: result.modifiedCount };
};