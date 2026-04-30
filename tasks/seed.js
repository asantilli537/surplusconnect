import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import {
  usersCollection,
  listingsCollection,
  transactionsCollection,
  messagesCollection,
  notificationsCollection,
  addressesCollection,
} from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

/*
  seed file for SurplusConnect. wipes the database and inserts
  realistic test data covering all four user roles, multiple listings
  in different statuses, completed and active transactions, a chat
  thread with messages, and notifications for each user.

  run with: npm run seed
*/

const SALT_ROUNDS = 12;

const hashPw = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

const main = async () => {
  const db = await dbConnection();
  await db.dropDatabase();
  console.log('dropped existing database');

  // ---- addresses ----

  const addressCol = await addressesCollection();

  const addressDocs = [
    {
      _id:     new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      street:  '1 River St',
      city:    'Hoboken',
      state:   'NJ',
      zipCode: '07030',
      location: { latitude: 40.7440, longitude: -74.0324 },
    },
    {
      _id:     new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
      street:  '250 Broadway',
      city:    'New York',
      state:   'NY',
      zipCode: '10007',
      location: { latitude: 40.7127, longitude: -74.0059 },
    },
    {
      _id:     new ObjectId('cccccccccccccccccccccccc'),
      street:  '500 Washington St',
      city:    'Jersey City',
      state:   'NJ',
      zipCode: '07302',
      location: { latitude: 40.7178, longitude: -74.0431 },
    },
  ];

  await addressCol.insertMany(addressDocs);
  console.log('seeded addresses');

  // ---- users ----

  const userCol = await usersCollection();

  const donorPw       = await hashPw('DonorPass123!');
  const distributorPw = await hashPw('DistroPass123!');
  const volunteerPw   = await hashPw('VolPass123!');
  const adminPw       = await hashPw('AdminPass123!');
  const donor2Pw      = await hashPw('BakeryPass123!');

  const userDocs = [
    {
      _id:              new ObjectId('111111111111111111111111'),
      firstName:        'James',
      lastName:         'Rivera',
      email:            'james@riversdeli.com',
      phoneNumber:      '201-555-0101',
      hashedPassword:   donorPw,
      role:             'donor',
      organizationName: "River's Deli",
      einNumber:        null,
      address: {
        street:  '1 River St',
        city:    'Hoboken',
        state:   'NJ',
        zipCode: '07030',
      },
      tags:        'deli, prepared, sandwiches',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-04-01T10:00:00.000Z',
    },
    {
      _id:              new ObjectId('222222222222222222222222'),
      firstName:        'Maria',
      lastName:         'Chen',
      email:            'maria@communityfoodbank.org',
      phoneNumber:      '212-555-0202',
      hashedPassword:   distributorPw,
      role:             'distributor',
      organizationName: 'Community Food Bank of NYC',
      einNumber:        '13-1234567',
      address: {
        street:  '250 Broadway',
        city:    'New York',
        state:   'NY',
        zipCode: '10007',
      },
      tags:        'halal, vegetarian',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-04-01T11:00:00.000Z',
    },
    {
      _id:              new ObjectId('333333333333333333333333'),
      firstName:        'Kevin',
      lastName:         'Park',
      email:            'kevin@volunteer.com',
      phoneNumber:      '917-555-0303',
      hashedPassword:   volunteerPw,
      role:             'volunteer',
      organizationName: null,
      einNumber:        null,
      address: {
        street:  '500 Washington St',
        city:    'Jersey City',
        state:   'NJ',
        zipCode: '07302',
      },
      tags:        '',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-04-02T09:00:00.000Z',
    },
    {
      _id:              new ObjectId('444444444444444444444444'),
      firstName:        'Sarah',
      lastName:         'Mitchell',
      email:            'sarah@surplusconnect-admin.com',
      phoneNumber:      '201-555-0404',
      hashedPassword:   adminPw,
      role:             'admin',
      organizationName: null,
      einNumber:        null,
      address: {
        street:  '1 Castle Point Terrace',
        city:    'Hoboken',
        state:   'NJ',
        zipCode: '07030',
      },
      tags:        '',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-03-15T08:00:00.000Z',
    },
    {
      _id:              new ObjectId('555555555555555555555555'),
      firstName:        'Sofia',
      lastName:         'Patel',
      email:            'sofia@hobokenbakery.com',
      phoneNumber:      '201-555-0505',
      hashedPassword:   donor2Pw,
      role:             'donor',
      organizationName: 'Hoboken Artisan Bakery',
      einNumber:        null,
      address: {
        street:  '88 Hudson St',
        city:    'Hoboken',
        state:   'NJ',
        zipCode: '07030',
      },
      tags:        'bakery, pastries, gluten-free',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-04-03T08:30:00.000Z',
    },
  ];

  await userCol.insertMany(userDocs);
  console.log('seeded users');

  // ---- listings ----

  const listingCol = await listingsCollection();

  const listingDocs = [
    {
      _id:      new ObjectId('a1a1a1a1a1a1a1a1a1a1a1a1'),
      donorId:  new ObjectId('111111111111111111111111'),
      title:    'Fresh deli sandwiches and wraps',
      description: 'Assorted turkey, veggie, and tuna sandwiches from today. All individually wrapped.',
      items: [
        { name: 'Turkey sandwiches', quantity: 15, unit: 'pieces' },
        { name: 'Veggie wraps',      quantity: 8,  unit: 'pieces' },
        { name: 'Tuna sandwiches',   quantity: 6,  unit: 'pieces' },
      ],
      foodCategory:   'prepared',
      notes:          'Pickup from front counter. Ask for James.',
      addressId:      new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      status:         'delivered',
      postedAt:       '2026-04-10T11:00:00.000Z',
      pickupStart:    '2026-04-10T14:00:00.000Z',
      pickupEnd:      '2026-04-10T17:00:00.000Z',
      expirationTime: '2026-04-10T20:00:00.000Z',
      claimedById:    new ObjectId('222222222222222222222222'),
      priorityScore:  85,
    },
    {
      _id:      new ObjectId('b2b2b2b2b2b2b2b2b2b2b2b2'),
      donorId:  new ObjectId('555555555555555555555555'),
      title:    'Assorted croissants and muffins',
      description: "Today's unsold pastries. Mix of plain, chocolate, and blueberry.",
      items: [
        { name: 'Croissants', quantity: 24, unit: 'pieces' },
        { name: 'Muffins',    quantity: 18, unit: 'pieces' },
      ],
      foodCategory:   'bakery',
      notes:          'Side entrance on Hudson St. Ring the bell.',
      addressId:      new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      status:         'active',
      postedAt:       '2026-04-29T16:00:00.000Z',
      pickupStart:    '2026-04-29T18:00:00.000Z',
      pickupEnd:      '2026-04-29T20:00:00.000Z',
      expirationTime: '2026-04-29T21:00:00.000Z',
      claimedById:    null,
      priorityScore:  72,
    },
    {
      _id:      new ObjectId('c3c3c3c3c3c3c3c3c3c3c3c3'),
      donorId:  new ObjectId('111111111111111111111111'),
      title:    'Soup of the day - tomato basil',
      description: 'About 3 gallons of homemade tomato basil soup. Still warm.',
      items: [
        { name: 'Tomato basil soup', quantity: 3, unit: 'gallons' },
      ],
      foodCategory:   'prepared',
      notes:          'Bring your own containers if possible. We have a few extras.',
      addressId:      new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      status:         'claimed',
      postedAt:       '2026-04-29T15:30:00.000Z',
      pickupStart:    '2026-04-29T17:00:00.000Z',
      pickupEnd:      '2026-04-29T19:00:00.000Z',
      expirationTime: '2026-04-29T22:00:00.000Z',
      claimedById:    new ObjectId('222222222222222222222222'),
      priorityScore:  91,
    },
    {
      _id:      new ObjectId('d4d4d4d4d4d4d4d4d4d4d4d4'),
      donorId:  new ObjectId('555555555555555555555555'),
      title:    'Whole grain bread loaves',
      description: 'Six loaves of whole grain bread baked this morning.',
      items: [
        { name: 'Whole grain loaves', quantity: 6, unit: 'pieces' },
      ],
      foodCategory:   'bakery',
      notes:          'Bagged and ready to go.',
      addressId:      new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      status:         'active',
      postedAt:       '2026-04-29T14:00:00.000Z',
      pickupStart:    '2026-04-29T16:00:00.000Z',
      pickupEnd:      '2026-04-29T19:00:00.000Z',
      expirationTime: '2026-04-30T08:00:00.000Z',
      claimedById:    null,
      priorityScore:  45,
    },
  ];

  await listingCol.insertMany(listingDocs);
  console.log('seeded listings');

  // ---- transactions ----

  const txCol = await transactionsCollection();

  const txDocs = [
    {
      _id:           new ObjectId('e5e5e5e5e5e5e5e5e5e5e5e5'),
      listingId:     new ObjectId('a1a1a1a1a1a1a1a1a1a1a1a1'),
      donorId:       new ObjectId('111111111111111111111111'),
      distributorId: new ObjectId('222222222222222222222222'),
      status:        'delivered',
      claimedAt:     '2026-04-10T13:00:00.000Z',
      completedAt:   '2026-04-10T16:30:00.000Z',
      receiptSent:   true,
    },
    {
      _id:           new ObjectId('f6f6f6f6f6f6f6f6f6f6f6f6'),
      listingId:     new ObjectId('c3c3c3c3c3c3c3c3c3c3c3c3'),
      donorId:       new ObjectId('111111111111111111111111'),
      distributorId: new ObjectId('222222222222222222222222'),
      status:        'claimed',
      claimedAt:     '2026-04-29T15:45:00.000Z',
      completedAt:   null,
      receiptSent:   false,
    },
  ];

  await txCol.insertMany(txDocs);
  console.log('seeded transactions');

  // ---- messages ----

  const msgCol = await messagesCollection();

  const msgDocs = [
    {
      _id:           new ObjectId('a0a0a0a0a0a0a0a0a0a0a0a0'),
      transactionId: 'e5e5e5e5e5e5e5e5e5e5e5e5',
      donorId:       '111111111111111111111111',
      distributorId: '222222222222222222222222',
      isReadOnly:    true,
      lockedAt:      '2026-04-10T16:30:00.000Z',
      messages: [
        {
          _id:        new ObjectId(),
          senderId:   '222222222222222222222222',
          senderName: 'Maria Chen',
          content:    'Hi James! We just claimed your listing. What time works best for pickup?',
          timestamp:  '2026-04-10T13:05:00.000Z',
        },
        {
          _id:        new ObjectId(),
          senderId:   '111111111111111111111111',
          senderName: 'James Rivera',
          content:    'Hey Maria! Anytime between 2 and 5 works great. Ask for me at the front.',
          timestamp:  '2026-04-10T13:12:00.000Z',
        },
        {
          _id:        new ObjectId(),
          senderId:   '222222222222222222222222',
          senderName: 'Maria Chen',
          content:    'Perfect, we will be there around 3pm. Thank you so much!',
          timestamp:  '2026-04-10T13:18:00.000Z',
        },
      ],
      createdAt: '2026-04-10T13:00:00.000Z',
    },
    {
      _id:           new ObjectId('b0b0b0b0b0b0b0b0b0b0b0b0'),
      transactionId: 'f6f6f6f6f6f6f6f6f6f6f6f6',
      donorId:       '111111111111111111111111',
      distributorId: '222222222222222222222222',
      isReadOnly:    false,
      messages: [
        {
          _id:        new ObjectId(),
          senderId:   '222222222222222222222222',
          senderName: 'Maria Chen',
          content:    'Hi James, we claimed the soup. Can we pick up around 5:30?',
          timestamp:  '2026-04-29T15:50:00.000Z',
        },
        {
          _id:        new ObjectId(),
          senderId:   '111111111111111111111111',
          senderName: 'James Rivera',
          content:    '5:30 works perfectly. See you then!',
          timestamp:  '2026-04-29T15:55:00.000Z',
        },
      ],
      createdAt: '2026-04-29T15:46:00.000Z',
    },
  ];

  await msgCol.insertMany(msgDocs);
  console.log('seeded messages');

  // ---- notifications ----

  const notifCol = await notificationsCollection();

  const notifDocs = [
    {
      userId:   '111111111111111111111111',
      type:     'listing_claimed',
      message:  'Community Food Bank of NYC claimed your listing "Fresh deli sandwiches and wraps"',
      isRead:   true,
      sentTime: '2026-04-10T13:00:00.000Z',
    },
    {
      userId:   '111111111111111111111111',
      type:     'pickup_confirmed',
      message:  'Pickup confirmed for "Fresh deli sandwiches and wraps". Receipt sent to your email.',
      isRead:   true,
      sentTime: '2026-04-10T16:30:00.000Z',
    },
    {
      userId:   '111111111111111111111111',
      type:     'listing_claimed',
      message:  'Community Food Bank of NYC claimed your listing "Soup of the day - tomato basil"',
      isRead:   false,
      sentTime: '2026-04-29T15:45:00.000Z',
    },
    {
      userId:   '222222222222222222222222',
      type:     'new_listing_nearby',
      message:  'New listing nearby: "Assorted croissants and muffins" from Hoboken Artisan Bakery',
      isRead:   false,
      sentTime: '2026-04-29T16:01:00.000Z',
    },
    {
      userId:   '222222222222222222222222',
      type:     'new_listing_nearby',
      message:  'New listing nearby: "Whole grain bread loaves" from Hoboken Artisan Bakery',
      isRead:   false,
      sentTime: '2026-04-29T14:01:00.000Z',
    },
    {
      userId:   '333333333333333333333333',
      type:     'pickup_scheduled',
      message:  'A pickup near you has been scheduled. Check your assignments.',
      isRead:   false,
      sentTime: '2026-04-29T15:50:00.000Z',
    },
  ];

  await notifCol.insertMany(notifDocs);
  console.log('seeded notifications');

  console.log('');
  console.log('---- seed complete ----');
  console.log('');
  console.log('test accounts:');
  console.log('  donor:        james@riversdeli.com           / DonorPass123!');
  console.log('  donor 2:      sofia@hobokenbakery.com        / BakeryPass123!');
  console.log('  distributor:  maria@communityfoodbank.org    / DistroPass123!');
  console.log('  volunteer:    kevin@volunteer.com            / VolPass123!');
  console.log('  admin:        sarah@surplusconnect-admin.com / AdminPass123!');

  await closeConnection();
};

main().catch(async (e) => {
  console.error('seed failed:', e);
  await closeConnection();
  process.exit(1);
});