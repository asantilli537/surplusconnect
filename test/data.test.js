import { strict as assert } from 'assert';

/*
  integration tests for the five core data functions.
  these tests run against the real Atlas database using a
  unique email prefix so test records can be identified
  and cleaned up without affecting seed data.

  test accounts use the prefix test_ and are removed after
  each test suite runs to keep the database clean.
*/

// ---- import data functions ----

import { createUser, loginUser, getUserById } from '../data/users.js';
import { createListing, getListingById } from '../data/listings.js';
import { createComplaint } from '../data/complaints.js';
import { usersCollection, listingsCollection } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';

// ---- test helpers ----

const TEST_PREFIX  = `test_${Date.now()}`;
const testEmail    = (n) => `${TEST_PREFIX}_${n}@testuser.surplusconnect.test`;
const createdIds   = { users: [], listings: [] };

const cleanup = async () => {
  const users    = await usersCollection();
  const listings = await listingsCollection();
  await users.deleteMany({ email: { $regex: /testuser\.surplusconnect\.test$/ } });
  if (createdIds.listings.length > 0) {
    await listings.deleteMany({
      _id: { $in: createdIds.listings.map((id) => new ObjectId(id)) },
    });
  }
};

// ---- createUser tests ----

describe('createUser', function () {

  after(cleanup);

  it('creates a donor account with valid data', async function () {
    const user = await createUser({
      firstName:        'Test',
      lastName:         'Donor',
      email:            testEmail('donor1'),
      phoneNumber:      '201-555-0101',
      password:         'TestPass123!abc',
      role:             'donor',
      organizationName: 'Test Deli',
      street:           '1 Test St',
      city:             'Hoboken',
      state:            'NJ',
      zipCode:          '07030',
    });
    createdIds.users.push(user._id);
    assert.equal(user.role,             'donor');
    assert.equal(user.email,            testEmail('donor1'));
    assert.equal(user.isVerified,       true);
    assert.equal(user.isSuspended,      false);
    assert.equal(user.hashedPassword,   undefined, 'password hash must not be returned');
  });

  it('creates a distributor with isVerified false by default', async function () {
    const user = await createUser({
      firstName:        'Test',
      lastName:         'Distributor',
      email:            testEmail('distro1'),
      phoneNumber:      '201-555-0102',
      password:         'TestPass123!abc',
      role:             'distributor',
      organizationName: 'Test Food Bank',
      einNumber:        '13-1234567',
      street:           '2 Test Ave',
      city:             'Newark',
      state:            'NJ',
      zipCode:          '07101',
    });
    createdIds.users.push(user._id);
    assert.equal(user.isVerified, false);
  });

  it('creates a distributor with isVerified true when passed explicitly', async function () {
    const user = await createUser({
      firstName:        'Test',
      lastName:         'Verified',
      email:            testEmail('distro2'),
      phoneNumber:      '201-555-0103',
      password:         'TestPass123!abc',
      role:             'distributor',
      organizationName: 'Verified Food Bank',
      einNumber:        '13-1234567',
      street:           '3 Test Blvd',
      city:             'Jersey City',
      state:            'NJ',
      zipCode:          '07302',
      isVerified:       true,
    });
    createdIds.users.push(user._id);
    assert.equal(user.isVerified, true);
  });

  it('throws when email is already taken', async function () {
    await assert.rejects(
      () => createUser({
        firstName:        'Dupe',
        lastName:         'User',
        email:            testEmail('donor1'),
        phoneNumber:      '201-555-0104',
        password:         'TestPass123!abc',
        role:             'donor',
        organizationName: 'Dupe Org',
        street:           '4 Test Rd',
        city:             'Hoboken',
        state:            'NJ',
        zipCode:          '07030',
      }),
      /already exists/i
    );
  });

  it('throws when required fields are missing', async function () {
    await assert.rejects(
      () => createUser({ email: testEmail('missing'), role: 'donor' }),
      Error
    );
  });

  it('throws when role is invalid', async function () {
    await assert.rejects(
      () => createUser({
        firstName:   'Bad',
        lastName:    'Role',
        email:       testEmail('badrole'),
        phoneNumber: '201-555-0105',
        password:    'TestPass123!abc',
        role:        'superadmin',
        street:      '5 Test Ln',
        city:        'Hoboken',
        state:       'NJ',
        zipCode:     '07030',
      }),
      Error
    );
  });

  it('throws when password does not meet requirements', async function () {
    await assert.rejects(
      () => createUser({
        firstName:        'Weak',
        lastName:         'Password',
        email:            testEmail('weakpass'),
        phoneNumber:      '201-555-0106',
        password:         'weak',
        role:             'donor',
        organizationName: 'Weak Org',
        street:           '6 Test St',
        city:             'Hoboken',
        state:            'NJ',
        zipCode:          '07030',
      }),
      Error
    );
  });

});

// ---- loginUser tests ----

describe('loginUser', function () {

  let testUserEmail;

  before(async function () {
    testUserEmail = testEmail('logintest');
    await createUser({
      firstName:        'Login',
      lastName:         'Test',
      email:            testUserEmail,
      phoneNumber:      '201-555-0200',
      password:         'LoginPass123!abc',
      role:             'donor',
      organizationName: 'Login Test Org',
      street:           '7 Login St',
      city:             'Hoboken',
      state:            'NJ',
      zipCode:          '07030',
    });
  });

  after(cleanup);

  it('returns session data with correct credentials', async function () {
    const user = await loginUser(testUserEmail, 'LoginPass123!abc');
    assert.equal(user.email,          testUserEmail);
    assert.equal(user.role,           'donor');
    assert.ok(user._id,               'should return an _id');
    assert.equal(user.hashedPassword, undefined, 'hash must not be returned');
  });

  it('throws with wrong password', async function () {
    await assert.rejects(
      () => loginUser(testUserEmail, 'WrongPassword999!'),
      /invalid email or password/i
    );
  });

  it('throws with wrong email', async function () {
    await assert.rejects(
      () => loginUser('notreal@nowhere.com', 'LoginPass123!abc'),
      /invalid email or password/i
    );
  });

  it('throws when email is missing', async function () {
    await assert.rejects(
      () => loginUser('', 'LoginPass123!abc'),
      Error
    );
  });

  it('throws when password is missing', async function () {
    await assert.rejects(
      () => loginUser(testUserEmail, ''),
      Error
    );
  });

});

// ---- createListing tests ----

describe('createListing', function () {

  let donorId;

  before(async function () {
    const user = await createUser({
      firstName:        'Listing',
      lastName:         'Donor',
      email:            testEmail('listingdonor'),
      phoneNumber:      '201-555-0300',
      password:         'ListingPass123!abc',
      role:             'donor',
      organizationName: 'Listing Test Deli',
      street:           '8 Listing Ave',
      city:             'Hoboken',
      state:            'NJ',
      zipCode:          '07030',
    });
    // explicitly converting to string since createListing's checkAndThrowId
    // expects a plain string not a MongoDB BSON ObjectId instance
    donorId = user._id.toString();
    createdIds.users.push(donorId);
  });

  after(cleanup);

  it('creates a listing with valid data', async function () {
    const future = new Date(Date.now() + 3600000).toISOString();
    const later  = new Date(Date.now() + 7200000).toISOString();
    const expiry = new Date(Date.now() + 9000000).toISOString();

    const listing = await createListing(donorId, {
      title:           'Test Bread',
      description:     'Fresh test bread',
      foodCategory:    'bakery',
      items:           [{ name: 'Sourdough', quantity: 5, unit: 'boxes' }],
      pickupStartTime: future,
      pickupEndTime:   later,
      expirationTime:  expiry,
      street:          '8 Listing Ave',
      city:            'Hoboken',
      state:           'NJ',
      zipCode:         '07030',
    });

    createdIds.listings.push(listing._id.toString());
    assert.equal(listing.title,        'Test Bread');
    assert.equal(listing.status,       'active');
    assert.equal(listing.foodCategory, 'bakery');
    assert.ok(listing.priorityScore >= 0 && listing.priorityScore <= 100);
  });

  it('throws when title is missing', async function () {
    const future = new Date(Date.now() + 3600000).toISOString();
    const later  = new Date(Date.now() + 7200000).toISOString();
    const expiry = new Date(Date.now() + 9000000).toISOString();

    await assert.rejects(
      () => createListing(donorId, {
        title:           '',
        foodCategory:    'bakery',
        items:           [{ name: 'Bread', quantity: 1, unit: 'boxes' }],
        pickupStartTime: future,
        pickupEndTime:   later,
        expirationTime:  expiry,
        street:          '8 Listing Ave',
        city:            'Hoboken',
        state:           'NJ',
        zipCode:         '07030',
      }),
      Error
    );
  });

  it('throws when food category is invalid', async function () {
    const future = new Date(Date.now() + 3600000).toISOString();
    const later  = new Date(Date.now() + 7200000).toISOString();
    const expiry = new Date(Date.now() + 9000000).toISOString();

    await assert.rejects(
      () => createListing(donorId, {
        title:           'Bad Category Listing',
        foodCategory:    'junkfood',
        items:           [{ name: 'Chips', quantity: 1, unit: 'bags' }],
        pickupStartTime: future,
        pickupEndTime:   later,
        expirationTime:  expiry,
        street:          '8 Listing Ave',
        city:            'Hoboken',
        state:           'NJ',
        zipCode:         '07030',
      }),
      Error
    );
  });

  it('throws when items array is empty', async function () {
    const future = new Date(Date.now() + 3600000).toISOString();
    const later  = new Date(Date.now() + 7200000).toISOString();
    const expiry = new Date(Date.now() + 9000000).toISOString();

    await assert.rejects(
      () => createListing(donorId, {
        title:           'No Items Listing',
        foodCategory:    'bakery',
        items:           [],
        pickupStartTime: future,
        pickupEndTime:   later,
        expirationTime:  expiry,
        street:          '8 Listing Ave',
        city:            'Hoboken',
        state:           'NJ',
        zipCode:         '07030',
      }),
      Error
    );
  });

  it('throws when pickup end is before pickup start', async function () {
    const future = new Date(Date.now() + 3600000).toISOString();
    const past   = new Date(Date.now() + 1800000).toISOString();
    const expiry = new Date(Date.now() + 9000000).toISOString();

    await assert.rejects(
      () => createListing(donorId, {
        title:           'Bad Time Listing',
        foodCategory:    'bakery',
        items:           [{ name: 'Bread', quantity: 1, unit: 'boxes' }],
        pickupStartTime: future,
        pickupEndTime:   past,
        expirationTime:  expiry,
        street:          '8 Listing Ave',
        city:            'Hoboken',
        state:           'NJ',
        zipCode:         '07030',
      }),
      Error
    );
  });

  it('throws when donor does not exist in database', async function () {
    const future = new Date(Date.now() + 3600000).toISOString();
    const later  = new Date(Date.now() + 7200000).toISOString();
    const expiry = new Date(Date.now() + 9000000).toISOString();

    await assert.rejects(
      () => createListing('507f191e810c19729de860ea', {
        title:           'Ghost Donor Listing',
        foodCategory:    'bakery',
        items:           [{ name: 'Bread', quantity: 1, unit: 'boxes' }],
        pickupStartTime: future,
        pickupEndTime:   later,
        expirationTime:  expiry,
        street:          '8 Listing Ave',
        city:            'Hoboken',
        state:           'NJ',
        zipCode:         '07030',
      }),
      /not found or is not eligible/i
    );
  });

});

// ---- createComplaint tests ----

describe('createComplaint', function () {

  it('throws when filer is not a transaction party', async function () {
    await assert.rejects(
      () => createComplaint({
        filedById:     '111111111111111111111111',
        transactionId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        listingId:     'bbbbbbbbbbbbbbbbbbbbbbbb',
        donorId:       '222222222222222222222222',
        distributorId: '333333333333333333333333',
        complaint:     'this is a test complaint that is long enough',
      }),
      /only file a complaint about a transaction you are involved in/i
    );
  });

  it('throws when complaint text is too short', async function () {
    await assert.rejects(
      () => createComplaint({
        filedById:     '111111111111111111111111',
        transactionId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        listingId:     'bbbbbbbbbbbbbbbbbbbbbbbb',
        donorId:       '111111111111111111111111',
        distributorId: '333333333333333333333333',
        complaint:     'short',
      }),
      Error
    );
  });

  it('throws when required fields are missing', async function () {
    await assert.rejects(
      () => createComplaint({}),
      Error
    );
  });

  it('throws when complaint data is not an object', async function () {
    await assert.rejects(
      () => createComplaint('not an object'),
      /complaint data is required/i
    );
  });

});