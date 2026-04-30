import { ObjectId } from 'mongodb';
import { messagesCollection } from '../config/mongoCollections.js';
import * as h from '../helpers.js';

// ---- createThread ----

/*
  called right after a distributor claims a listing. creates the
  thread document that all messages for this transaction live inside.
  throwing early if a thread already exists prevents duplicates.
*/
export const createThread = async (transactionId, donorId, distributorId) => {

  /* Input Validation */
  const cleanTxId   = h.checkAndThrowId(String(transactionId),  'transactionId');
  const cleanDonor  = h.checkAndThrowId(String(donorId),         'donorId');
  const cleanDistro = h.checkAndThrowId(String(distributorId),   'distributorId');

  const messages = await messagesCollection();

  // one thread per transaction, no exceptions
  const existing = await messages.findOne({ transactionId: cleanTxId });
  if (existing) throw new Error('a thread already exists for this transaction');

  const newThread = {
    transactionId: cleanTxId,
    donorId:       cleanDonor,
    distributorId: cleanDistro,
    isReadOnly:    false,
    messages:      [],
    createdAt:     new Date().toISOString(),
  };

  const result = await messages.insertOne(newThread);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error('failed to create message thread');
  }

  return await getThread(cleanTxId);
};

// ---- getThread ----

/*
  returns the full thread document including all messages.
  the chat route GET handler calls this to render the initial
  conversation view.
*/
export const getThread = async (transactionId) => {

  /* Input Validation */
  const cleanTxId = h.checkAndThrowId(String(transactionId), 'transactionId');

  const messages = await messagesCollection();
  const thread   = await messages.findOne({ transactionId: cleanTxId });

  if (!thread) throw new Error('no chat thread found for this transaction');
  return thread;
};

// ---- addMessage ----

/*
  appends a message subdocument to the thread's messages array.
  checking isReadOnly before writing so completed transactions
  stay locked. content is sanitized here before hitting the db.
*/
export const addMessage = async (transactionId, senderId, senderName, content) => {

  /* Input Validation */
  const cleanTxId       = h.checkAndThrowId(String(transactionId), 'transactionId');
  const cleanSenderId   = h.checkAndThrowId(String(senderId),       'senderId');
  const cleanSenderName = h.checkAndThrowString(senderName, 'senderName', 1, 100);

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('message content is required');
  }
  if (content.trim().length > 1000) {
    throw new Error('message cannot exceed 1000 characters');
  }

  // sanitizing user-supplied text before it goes anywhere near the db
  const cleanContent = h.sanitize(content.trim());
  const safeName     = h.sanitize(cleanSenderName);

  const messages = await messagesCollection();

  // checking thread exists and is still open before writing
  const thread = await messages.findOne({ transactionId: cleanTxId });
  if (!thread) throw new Error('no chat thread found for this transaction');
  if (thread.isReadOnly) {
    throw new Error('this conversation is locked because the transaction is complete');
  }

  const newMessage = {
    _id:        new ObjectId(),
    senderId:   cleanSenderId,
    senderName: safeName,
    content:    cleanContent,
    timestamp:  new Date().toISOString(),
  };

  const result = await messages.updateOne(
    { transactionId: cleanTxId },
    { $push: { messages: newMessage } }
  );

  if (result.modifiedCount === 0) {
    throw new Error('failed to add message to thread');
  }

  // returning a plain object so the caller never gets a MongoDB document directly
  return {
    _id:        newMessage._id.toString(),
    senderId:   newMessage.senderId,
    senderName: newMessage.senderName,
    content:    newMessage.content,
    timestamp:  newMessage.timestamp,
  };
};

// ---- getMessagesSince ----

/*
  used by the poll endpoint. the client sends the timestamp of
  the last message it has seen, and we return only newer ones.
  this keeps the polling efficient instead of re-sending the
  whole thread on every 4 second interval.
*/
export const getMessagesSince = async (transactionId, since) => {

  /* Input Validation */
  const cleanTxId = h.checkAndThrowId(String(transactionId), 'transactionId');

  const messages = await messagesCollection();
  const thread   = await messages.findOne({ transactionId: cleanTxId });

  if (!thread) throw new Error('no chat thread found for this transaction');

  // returning everything if no since timestamp was provided
  if (!since || typeof since !== 'string' || since.trim().length === 0) {
    return thread.messages || [];
  }

  const sinceDate = new Date(since);

  // making sure the timestamp the client sent is actually parseable
  if (isNaN(sinceDate.getTime())) {
    throw new Error('since must be a valid ISO timestamp');
  }

  const newMessages = (thread.messages || []).filter((msg) => {
    return new Date(msg.timestamp) > sinceDate;
  });

  return newMessages;
};

// ---- lockThread ----

/*
  called when a transaction is marked delivered. setting isReadOnly
  to true preserves the full conversation history as a permanent
  record and prevents either party from modifying it after the fact.
  admins can still read the thread for complaint investigation.
*/
export const lockThread = async (transactionId) => {

  /* Input Validation */
  const cleanTxId = h.checkAndThrowId(String(transactionId), 'transactionId');

  const messages = await messagesCollection();

  const thread = await messages.findOne({ transactionId: cleanTxId });
  if (!thread) throw new Error('no chat thread found for this transaction');
  if (thread.isReadOnly) throw new Error('thread is already locked');

  const result = await messages.updateOne(
    { transactionId: cleanTxId },
    { $set: { isReadOnly: true, lockedAt: new Date().toISOString() } }
  );

  if (result.modifiedCount === 0) {
    throw new Error('failed to lock thread');
  }

  return { locked: true, transactionId: cleanTxId };
};