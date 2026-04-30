import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { usersCollection, auditLogsCollection } from '../config/mongoCollections.js';
import * as h from '../helpers.js';

const SALT_ROUNDS = 12;

// ---- createUser ----

export const createUser = async (userData) => {

  /*
    guarding against completely missing input before we
    try to destructure anything from it
  */
  if (!userData || typeof userData !== 'object') {
    throw new Error('user data is required');
  }

  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    role,
    organizationName,
    einNumber,
    street,
    city,
    state,
    zipCode,
    tags,
  } = userData;

  /* Input Validation */
  const cleanFirst  = h.checkAndThrowString(firstName, 'firstName', 2, 50);
  const cleanLast   = h.checkAndThrowString(lastName,  'lastName',  2, 50);
  const cleanEmail  = h.checkAndThrowEmail(email);
  const cleanPhone  = h.checkAndThrowPhone(phoneNumber);
  const cleanRole   = h.checkAndThrowRole(role);

  h.checkAndThrowPassword(password);

  // validating address fields
  const cleanStreet = h.checkAndThrowString(street, 'street', 2, 200);
  const cleanCity   = h.checkAndThrowString(city,   'city',   2, 100);
  const cleanState  = h.checkAndThrowState(state);
  const cleanZip    = h.checkAndThrowZip(zipCode);

  // org name required for donors and distributors
  let cleanOrg = null;
  if (cleanRole === 'donor' || cleanRole === 'distributor') {
    cleanOrg = h.checkAndThrowString(organizationName, 'organizationName', 2, 200);
  }

  // EIN only required for distributors
  let cleanEin = null;
  if (cleanRole === 'distributor') {
    cleanEin = h.checkAndThrowEin(einNumber);
  }

  /*
    sanitizing all free-text fields before they go anywhere near
    the database. email, phone, state, zip are format-validated
    so they don't need xss sanitization on top.
  */
  const safeName    = h.sanitize(cleanFirst);
  const safeLastName = h.sanitize(cleanLast);
  const safeOrg     = cleanOrg ? h.sanitize(cleanOrg) : null;
  const safeStreet  = h.sanitize(cleanStreet);
  const safeCity    = h.sanitize(cleanCity);
  const safeTags    = tags ? h.sanitize(String(tags)) : '';

  // duplicate email check before doing the expensive bcrypt hash
  const users    = await usersCollection();
  const existing = await users.findOne({ email: cleanEmail });
  if (existing) {
    throw new Error('an account with this email already exists');
  }

  // hashing the password, never storing it plain
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = {
    firstName:        safeName,
    lastName:         safeLastName,
    email:            cleanEmail,
    phoneNumber:      cleanPhone,
    hashedPassword,
    role:             cleanRole,
    organizationName: safeOrg,
    einNumber:        cleanEin,
    address: {
      street:  safeStreet,
      city:    safeCity,
      state:   cleanState,
      zipCode: cleanZip,
    },
    tags:        safeTags,
    isSuspended: false,
    // distributors start unverified until EIN is confirmed against IRS list
    isVerified:  cleanRole !== 'distributor',
    createdAt:   new Date().toISOString(),
  };

  const result = await users.insertOne(newUser);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error('failed to create user account');
  }

  return await getUserById(result.insertedId.toString());
};

// ---- getUserByEmail ----

export const getUserByEmail = async (email) => {
  const cleanEmail = h.checkAndThrowEmail(email);

  const users = await usersCollection();
  const user  = await users.findOne({ email: cleanEmail });

  if (!user) throw new Error('no account found with this email address');
  return user;
};

// ---- getUserById ----

export const getUserById = async (id) => {
  /*
    converting to string first in case someone passes an
    ObjectId object instead of a string id
  */
  const cleanId = h.checkAndThrowId(String(id), 'userId');

  const users = await usersCollection();
  const user  = await users.findOne({ _id: new ObjectId(cleanId) });

  if (!user) throw new Error('user not found');

  // stripping the password hash before returning
  const { hashedPassword, ...safeUser } = user;
  return safeUser;
};

// ---- loginUser ----

export const loginUser = async (email, password) => {

  /* Input Validation */
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    throw new Error('email is required');
  }
  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    throw new Error('password is required');
  }

  const cleanEmail = h.checkAndThrowEmail(email);
  const users      = await usersCollection();

  // getting the full document including hashedPassword for comparison
  const user = await users.findOne({ email: cleanEmail });

  /*
    using the same error message whether the email doesn't exist
    or the password is wrong. this prevents attackers from
    figuring out which emails are registered.
  */
  if (!user) throw new Error('invalid email or password');

  const passwordMatch = await bcrypt.compare(password.trim(), user.hashedPassword);
  if (!passwordMatch) throw new Error('invalid email or password');

  if (user.isSuspended) {
    throw new Error('this account has been suspended. please contact support');
  }

  // returning only what the session needs, never the hash
  return {
    _id:              user._id.toString(),
    firstName:        user.firstName,
    lastName:         user.lastName,
    email:            user.email,
    role:             user.role,
    organizationName: user.organizationName || null,
    isSuspended:      user.isSuspended,
    isVerified:       user.isVerified,
  };
};

// ---- getAllUsers ----

export const getAllUsers = async (filters = {}) => {

  /* Input Validation */
  if (typeof filters !== 'object' || filters === null) {
    throw new Error('filters must be an object');
  }

  const users = await usersCollection();
  const query = {};

  if (filters.role) {
  // making sure it's a plain string before validating
  if (typeof filters.role !== 'string' || !h.checkRoleValidity(filters.role)) {
        throw new Error('invalid role filter');
    }
    query.role = filters.role.trim().toLowerCase();
  }

  if (filters.status && filters.status !== '') {
    if (typeof filters.status !== 'string') {
        throw new Error('invalid status filter');
    }
  }

  if (filters.status === 'suspended') {
    query.isSuspended = true;
  } else if (filters.status === 'active') {
    query.isSuspended = false;
  } else if (filters.status && filters.status !== '') {
    throw new Error('status filter must be active or suspended');
  }

  const allUsers = await users.find(query).toArray();

  // stripping password hashes from every result before returning
  return allUsers.map(({ hashedPassword, ...safeUser }) => safeUser);
};

// ---- suspendUser ----

export const suspendUser = async (userId, adminId) => {

  /* Input Validation */
  const cleanUserId  = h.checkAndThrowId(String(userId),  'userId');
  const cleanAdminId = h.checkAndThrowId(String(adminId), 'adminId');

  const users = await usersCollection();

  const target = await users.findOne({ _id: new ObjectId(cleanUserId) });
  if (!target) throw new Error('user not found');
  if (target.isSuspended) throw new Error('user is already suspended');
  if (target.role === 'admin') throw new Error('admin accounts cannot be suspended');

  // making sure an admin can't suspend themselves
  if (cleanUserId === cleanAdminId) {
    throw new Error('you cannot suspend your own account');
  }

  const result = await users.updateOne(
    { _id: new ObjectId(cleanUserId) },
    {
      $set: {
        isSuspended: true,
        suspendedAt: new Date().toISOString(),
        suspendedBy: cleanAdminId,
      },
    }
  );

  if (result.modifiedCount === 0) throw new Error('failed to suspend user');

  // logging this admin action for the audit trail
  try {
    const logs = await auditLogsCollection();
    await logs.insertOne({
      action:       'suspend_account',
      adminId:      cleanAdminId,
      targetUserId: cleanUserId,
      description:  `suspended account for user ${target.email}`,
      timestamp:    new Date().toISOString(),
    });
  } catch (e) {
    // not throwing here, the suspension succeeded even if the log failed
    console.error('audit log failed after suspend:', e.message);
  }

  return { suspended: true, userId: cleanUserId };
};

// ---- unsuspendUser ----

export const unsuspendUser = async (userId, adminId) => {

  /* Input Validation */
  const cleanUserId  = h.checkAndThrowId(String(userId),  'userId');
  const cleanAdminId = h.checkAndThrowId(String(adminId), 'adminId');

  const users = await usersCollection();

  const target = await users.findOne({ _id: new ObjectId(cleanUserId) });
  if (!target) throw new Error('user not found');
  if (!target.isSuspended) throw new Error('user is not currently suspended');

  const result = await users.updateOne(
    { _id: new ObjectId(cleanUserId) },
    {
      $set:   { isSuspended: false, unsuspendedAt: new Date().toISOString() },
      $unset: { suspendedAt: '', suspendedBy: '' },
    }
  );

  if (result.modifiedCount === 0) throw new Error('failed to unsuspend user');

  // logging the unsuspension for the audit trail
  try {
    const logs = await auditLogsCollection();
    await logs.insertOne({
      action:       'unsuspend_account',
      adminId:      cleanAdminId,
      targetUserId: cleanUserId,
      description:  `unsuspended account for user ${target.email}`,
      timestamp:    new Date().toISOString(),
    });
  } catch (e) {
    console.error('audit log failed after unsuspend:', e.message);
  }

  return { suspended: false, userId: cleanUserId };
};