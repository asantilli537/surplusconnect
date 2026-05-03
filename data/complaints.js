import { ObjectId } from 'mongodb';
import { complaintsCollection } from '../config/mongoCollections.js';
import * as h from '../helpers.js';
import { auditLogsCollection } from '../config/mongoCollections.js';

/*
  complaints are filed against a specific transaction when something
  goes wrong during coordination or pickup. either the donor or
  distributor involved in a transaction can file one. admins review
  and resolve them through the admin panel.
*/

const validStatuses = ['open', 'investigation', 'resolved'];

// ---- createComplaint ----

/*
  takes a single data object so argument order mistakes are impossible.
  verifying the person filing is actually a party to the transaction
  before touching the database.
*/
export const createComplaint = async (complaintData) => {

  /* Input Validation */
  if (!complaintData || typeof complaintData !== 'object') {
    throw new Error('complaint data is required');
  }

  const {
    filedById,
    transactionId,
    listingId,
    donorId,
    distributorId,
    complaint,
  } = complaintData;

  const cleanFiledBy       = h.checkAndThrowId(String(filedById),       'filedById');
  const cleanTxId          = h.checkAndThrowId(String(transactionId),    'transactionId');
  const cleanListingId     = h.checkAndThrowId(String(listingId),        'listingId');
  const cleanDonorId       = h.checkAndThrowId(String(donorId),          'donorId');
  const cleanDistributorId = h.checkAndThrowId(String(distributorId),    'distributorId');
  const cleanText          = h.checkAndThrowString(complaint, 'complaint', 10, 2000);

  // only parties directly involved in the transaction can file
  if (cleanFiledBy !== cleanDonorId && cleanFiledBy !== cleanDistributorId) {
    throw new Error('you can only file a complaint about a transaction you are involved in');
  }

  // sanitizing the complaint text before storing it
  const safeText = h.sanitize(cleanText);

  const complaints = await complaintsCollection();

  const newComplaint = {
    filedById:       cleanFiledBy,
    transactionId:   cleanTxId,
    listingId:       cleanListingId,
    donorId:         cleanDonorId,
    distributorId:   cleanDistributorId,
    complaint:       safeText,
    status:          'open',
    isResolved:      false,
    filedAt:         new Date().toISOString(),
    resolvedAt:      null,
    resolvedBy:      null,
  };

  const result = await complaints.insertOne(newComplaint);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error('failed to file complaint');
  }

  return { complaintId: result.insertedId.toString() };
};

// ---- getAllComplaints ----

/*
  returns all complaints sorted newest first.
  supports optional status filter from the admin complaints page.
*/
export const getAllComplaints = async (filters = {}) => {

  /* Input Validation */
  if (typeof filters !== 'object' || filters === null) {
    throw new Error('filters must be an object');
  }

  const complaints = await complaintsCollection();
  const query      = {};

  if (filters.status) {
    if (typeof filters.status !== 'string') {
      throw new Error('status filter must be a string');
    }
    // trimming before validating so whitespace-only strings are ignored
    const cleanStatus = filters.status.trim().toLowerCase();
    if (cleanStatus.length > 0) {
      if (!validStatuses.includes(cleanStatus)) {
        throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
      }
      query.status = cleanStatus;
    }
  }

  const allComplaints = await complaints
    .find(query)
    .sort({ filedAt: -1 })
    .toArray();

  return allComplaints;
};

// ---- getComplaintById ----

export const getComplaintById = async (id) => {

  /* Input Validation */
  const cleanId = h.checkAndThrowId(String(id), 'complaintId');

  const complaints = await complaintsCollection();
  const complaint  = await complaints.findOne({ _id: new ObjectId(cleanId) });

  if (!complaint) throw new Error('complaint not found');
  return complaint;
};

// ---- resolveComplaint ----

/*
  marks a complaint as resolved by a specific admin. records the
  resolver and timestamp so there is a full audit trail.
*/
export const resolveComplaint = async (complaintId, adminId) => {

  /* Input Validation */
  const cleanComplaintId = h.checkAndThrowId(String(complaintId), 'complaintId');
  const cleanAdminId     = h.checkAndThrowId(String(adminId),     'adminId');

  const complaints = await complaintsCollection();
  const complaint  = await complaints.findOne({ _id: new ObjectId(cleanComplaintId) });

  if (!complaint) throw new Error('complaint not found');
  if (complaint.isResolved) throw new Error('this complaint has already been resolved');

  const result = await complaints.updateOne(
    { _id: new ObjectId(cleanComplaintId) },
    {
      $set: {
        status:     'resolved',
        isResolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: cleanAdminId,
      },
    }
  );

  if (result.modifiedCount === 0) throw new Error('failed to resolve complaint');

  // writing to the audit log so admins can see who resolved what and when
  try {
  const logs = await auditLogsCollection();
  await logs.insertOne({
    action:       'resolve_complaint',
    adminId:      cleanAdminId,
    targetId:     cleanComplaintId,
    description:  `resolved complaint ${cleanComplaintId}`,
    timestamp:    new Date().toISOString(),
  });
  } catch (e) {
  // not blocking the resolution if the audit log fails
  console.error('audit log failed after complaint resolve:', e.message);
  }

  return { resolved: true, complaintId: cleanComplaintId };
};