import {dbConnection} from './mongoConnection.js';

/* This will allow you to have one reference to each collection per app */
/* Feel free to copy and paste this this */
const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

export const listings = getCollectionFn('listings');
export const trasactions = getCollectionFn('transactions');
export const addresses = getCollectionFn('addresses');
export const receipts = getCollectionFn('receipts');
