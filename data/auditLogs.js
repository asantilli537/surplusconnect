import { auditLogsCollection } from '../config/mongoCollections.js';

/*
  audit logs record every admin action taken on the platform.
  they are written automatically by suspendUser, unsuspendUser,
  and resolveComplaint in the data layer. admins can read them
  through the admin panel but they cannot be modified or deleted.
*/

// ---- getAllAuditLogs ----

/*
  returns all audit log entries sorted newest first.
  supports an optional action type filter from the admin audit log page.
*/
export const getAllAuditLogs = async (filters = {}) => {

  /* Input Validation */
  if (typeof filters !== 'object' || filters === null) {
    throw new Error('filters must be an object');
  }

  const logs  = await auditLogsCollection();
  const query = {};

  if (filters.action) {
    if (typeof filters.action !== 'string') {
      throw new Error('action filter must be a string');
    }
    // trimming first so whitespace-only strings are treated as no filter
    const cleanAction = filters.action.trim();
    if (cleanAction.length > 0) {
      query.action = cleanAction;
    }
  }

  const allLogs = await logs
    .find(query)
    .sort({ timestamp: -1 })
    .toArray();

  return allLogs;
};

// ---- getRecentAuditLogs ----

/*
  returns the most recent N audit log entries.
  used by the admin dashboard preview section.
*/
export const getRecentAuditLogs = async (limit = 10) => {

  /* Input Validation */
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('limit must be a whole number between 1 and 100');
  }

  const logs = await auditLogsCollection();

  const recentLogs = await logs
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return recentLogs;
};