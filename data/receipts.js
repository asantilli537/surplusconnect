import { ObjectId } from 'mongodb';
import { receiptsCollection } from '../config/mongoCollections.js';
import * as h from '../helpers.js';

/*
  receipts are generated automatically when a distributor marks a
  pickup as delivered. they serve as official tax-deductible donation
  records for the donor under IRS Section 170. each receipt contains
  all the information a donor needs to claim a food donation deduction.
*/

// ---- generateReceiptNumber ----

/*
  generating a unique receipt number in the format SC-YYYY-XXXXX.
  retrying up to 5 times if a collision is detected, which is
  extremely unlikely with a 90,000 value space but handled anyway.
*/
const generateReceiptNumber = async (receipts) => {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = String(Math.floor(Math.random() * 90000) + 10000);
    const candidate = `SC-${year}-${suffix}`;

    // checking for collision before returning
    const existing = await receipts.findOne({ receiptNumber: candidate });
    if (!existing) return candidate;
  }

  // extremely unlikely to reach here but throwing a clear error if we do
  throw new Error('failed to generate a unique receipt number after 5 attempts');
};

// ---- buildTaxStatement ----

/*
  building the IRS-compliant tax statement string from donor and
  distributor data. guarding every field against null so the
  statement always reads grammatically even with missing org names.
*/
const buildTaxStatement = (donor, distributor) => {
  const donorName = donor.organizationName
    ? donor.organizationName
    : `${donor.firstName} ${donor.lastName}`;

  const distributorName = distributor.organizationName
    ? distributor.organizationName
    : `${distributor.firstName} ${distributor.lastName}`;

  const einClause = distributor.einNumber
    ? `, a tax-exempt organization under IRS Section 501(c)(3) with EIN ${distributor.einNumber},`
    : '';

  const dateStr = new Date().toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });

  return `This letter acknowledges that ${donorName} made a charitable food donation to ${distributorName}${einClause} on ${dateStr}. No goods or services were provided in exchange for this donation.`;
};

// ---- createReceipt ----

/*
  called automatically by markListingDelivered after a pickup is confirmed.
  builds the full receipt document from the listing, donor, and distributor
  data so the donor has everything they need for their tax filing.
*/
export const createReceipt = async (listingId, transactionId, listing, donor, distributor) => {

  /* Input Validation */
  const cleanListingId     = h.checkAndThrowId(String(listingId),     'listingId');
  const cleanTransactionId = h.checkAndThrowId(String(transactionId), 'transactionId');

  if (!listing || typeof listing !== 'object') {
    throw new Error('listing data is required to generate a receipt');
  }
  if (!donor || typeof donor !== 'object') {
    throw new Error('donor data is required to generate a receipt');
  }
  if (!distributor || typeof distributor !== 'object') {
    throw new Error('distributor data is required to generate a receipt');
  }

  // validating required donor fields
  if (!donor._id || !donor.firstName || !donor.lastName || !donor.email) {
    throw new Error('donor document is missing required fields');
  }

  // validating required distributor fields
  if (!distributor._id || !distributor.firstName || !distributor.lastName || !distributor.email) {
    throw new Error('distributor document is missing required fields');
  }

  const receipts = await receiptsCollection();

  // preventing duplicate receipts for the same transaction
  const existing = await receipts.findOne({ transactionId: cleanTransactionId });
  if (existing) {
    console.warn('receipt already exists for transaction:', cleanTransactionId);
    return existing;
  }

  // generating receipt number with collision detection
  const receiptNumber = await generateReceiptNumber(receipts);

  // guarding against null or non-array items before reducing
  const safeItems = Array.isArray(listing.items) ? listing.items : [];
  const totalItems = safeItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  const newReceipt = {
    receiptNumber,
    listingId:       cleanListingId,
    transactionId:   cleanTransactionId,
    donorId:         String(donor._id),
    distributorId:   String(distributor._id),

    // snapshotting donor info at time of receipt so profile changes
    // do not affect historical receipts
    donorDetails: {
      firstName:        donor.firstName,
      lastName:         donor.lastName,
      organizationName: donor.organizationName || null,
      email:            donor.email,
      address:          donor.address || null,
    },

    // snapshotting distributor info including EIN for IRS verification
    distributorDetails: {
      firstName:        distributor.firstName,
      lastName:         distributor.lastName,
      organizationName: distributor.organizationName || null,
      einNumber:        distributor.einNumber || null,
      email:            distributor.email,
    },

    // snapshotting listing details at time of pickup for the permanent record
    donationDetails: {
      title:        listing.title,
      description:  listing.description || '',
      foodCategory: listing.foodCategory,
      items:        safeItems,
      totalItems,
      pickupDate:   listing.deliveredAt || new Date().toISOString(),
      notes:        listing.notes || '',
    },

    taxStatement: buildTaxStatement(donor, distributor),
    issuedAt:     new Date().toISOString(),
  };

  const result = await receipts.insertOne(newReceipt);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error('failed to generate receipt');
  }

  return { ...newReceipt, _id: result.insertedId };
};

// ---- getReceiptsByDonor ----

/*
  returns all receipts for a specific donor sorted newest first.
  used by the donor history page to show view receipt links next
  to each delivered listing.
*/
export const getReceiptsByDonor = async (donorId) => {

  /* Input Validation */
  const cleanDonorId = h.checkAndThrowId(String(donorId), 'donorId');

  const receipts = await receiptsCollection();

  const donorReceipts = await receipts
    .find({ donorId: cleanDonorId })
    .sort({ issuedAt: -1 })
    .toArray();

  return donorReceipts;
};

// ---- getReceiptById ----

/*
  returns a single receipt by its ObjectId.
  the route calling this must verify ownership before rendering.
*/
export const getReceiptById = async (id) => {

  /* Input Validation */
  const cleanId = h.checkAndThrowId(String(id), 'receiptId');

  const receipts = await receiptsCollection();
  const receipt  = await receipts.findOne({ _id: new ObjectId(cleanId) });

  if (!receipt) throw new Error('receipt not found');
  return receipt;
};

// ---- getReceiptByTransaction ----

/*
  returns the receipt for a specific transaction or null if none exists.
  used to check for duplicates before creating a new receipt.
*/
export const getReceiptByTransaction = async (transactionId) => {

  /* Input Validation */
  const cleanTxId = h.checkAndThrowId(String(transactionId), 'transactionId');

  const receipts = await receiptsCollection();
  const receipt  = await receipts.findOne({ transactionId: cleanTxId });

  return receipt || null;
};