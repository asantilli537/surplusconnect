import { dbConnection } from './mongoConnection.js';

/*
  each exported function returns a reference to one specific
  collection. callers await the function to get the collection
  and then run their queries against it.
*/

const getCollectionFn = (collectionName) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = db.collection(collectionName);
    }
    return _col;
  };
};

export const usersCollection         = getCollectionFn('users');
export const listingsCollection      = getCollectionFn('listings');
export const transactionsCollection  = getCollectionFn('transactions');
export const notificationsCollection = getCollectionFn('notifications');
export const messagesCollection      = getCollectionFn('messages');
export const receiptsCollection      = getCollectionFn('receipts');
export const complaintsCollection    = getCollectionFn('complaints');
export const auditLogsCollection     = getCollectionFn('auditLogs');
export const addressesCollection     = getCollectionFn('addresses');