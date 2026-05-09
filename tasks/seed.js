import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import {
  usersCollection,
  listingsCollection,
  transactionsCollection,
  messagesCollection,
  notificationsCollection,
  addressesCollection,
  complaintsCollection,
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
      _id:     new ObjectId('69feb389a2c903a408461c60'),
      street:  '1000 Maxwell Ln',
      city:    'Hoboken',
      state:   'NJ',
      zipCode: '07030',
      location: { latitude: 40.74927, longitude: -74.02562 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c61'),
      street:  '515 Washington St',
      city:    'Hoboken',
      state:   'NJ',
      zipCode: '07030',
      location: { latitude: 40.74290, longitude: -74.02905 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c62'),
      street:  '411 Washington St',
      city:    'Jersey City',
      state:   'NJ',
      zipCode: '07030',
      location: { latitude: 40.74191, longitude: -74.02946 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c63'),
      street:  '1221 6th Ave',
      city:    'New York City',
      state:   'NY',
      zipCode: '10020',
      location: { latitude: 40.75944, longitude: -73.98118 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c64'),
      street:  '201 W 33rd St',
      city:    'New York City',
      state:   'NY',
      zipCode: '10119',
      location: { latitude: 40.75067, longitude: -73.99134 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c65'),
      street:  '214 W 39th St',
      city:    'New York City',
      state:   'NY',
      zipCode: '10018',
      location: { latitude: 40.75454, longitude: -73.98895 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c66'),
      street:  '424 W 33rd St',
      city:    'New York City',
      state:   'NY',
      zipCode: '10001',
      location: { latitude: 40.75319, longitude: -73.99790 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c67'),
      street:  '24 W 45th St',
      city:    'New York City',
      state:   'NY',
      zipCode: '10036',
      location: { latitude: 40.75591, longitude: -73.98082},
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c68'),
      street:  '451 Palisade Ave',
      city:    'Jersey City',
      state:   'NJ',
      zipCode: '07307',
      location: { latitude: 40.74433, longitude: -74.04443 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c69'),
      street:  '1928 Broadway',
      city:    'New York City',
      state:   'NY',
      zipCode: '10023',
      location: { latitude: 40.77234, longitude: -73.98188 },
    },
    {
      _id:     new ObjectId('69feb389a2c903a408461c6a'),
      street:  '1 Castle Point Terrace',
      city:    'Hoboken',
      state:   'NJ',
      zipCode: '07030',
      location: { latitude: 40.74503, longitude: -74.02395 },
    },
  ];

  await addressCol.insertMany(addressDocs);
  console.log('seeded addresses');

  // ---- users ----

  const userCol = await usersCollection();

  const donorPw1       = await hashPw('DonorPass1!');
  const donorPw2       = await hashPw('DonorPass2@');
  const donorPw3       = await hashPw('DonorPass3#');
  const donorPw4       = await hashPw('DonorPass4$');
  const donorPw5       = await hashPw('DonorPass5%');
  const donorPw6       = await hashPw('DonorPass6^');
  const donorPw7       = await hashPw('DonorPass7&');
  const donorPw8       = await hashPw('DonorPass8*');
  const donorPw9       = await hashPw('DonorPass9(');
  const donorPw10       = await hashPw('DonorPass10)');

  const distributorPw1 = await hashPw('DistPass1!');
  const distributorPw2 = await hashPw('DistPass2@');
  const distributorPw3 = await hashPw('DistPass3#');
  const distributorPw4 = await hashPw('DistPass4$');
  const distributorPw5 = await hashPw('DistPass5%');
  const distributorPw6 = await hashPw('DistPass6^');
  const distributorPw7 = await hashPw('DistPass7&');
  const distributorPw8 = await hashPw('DistPass8*');
  const distributorPw9 = await hashPw('DistPass9(');
  const distributorPw10 = await hashPw('DistPass10)');

  const volunteerPw   = await hashPw('VolPass123!');

  const adminPw1       = await hashPw('AdminPass1!');
  const adminPw2       = await hashPw('AdminPass2@');
  const adminPw3       = await hashPw('AdminPass3#');
  const adminPw4       = await hashPw('AdminPass4$');

  const donor2Pw      = await hashPw('BakeryPass123!');

  const userDocs = [
    //Donor Data
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0990'),
      firstName:        'Philip',
      lastName:         'Desperaux',
      email:            'pdesperaux@mbaguette.com',
      phoneNumber:      '201-555-0100',
      hashedPassword:   donorPw1,
      role:             'donor',
      organizationName: "Marseille Baguette Co.",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c60'),
      tags:        'bakery, sandwiches, desserts, coffee',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0991'),
      firstName:        'Joe',
      lastName:         'Wazowski',
      email:            'jwazowski@sshoboken.com',
      phoneNumber:      '201-555-0101',
      hashedPassword:   donorPw2,
      role:             'donor',
      organizationName: "Smashed Sandwiches Hoboken",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c61'),
      tags:        'fast food, sandwiches, fries, meals',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0992'),
      firstName:        'Sal',
      lastName:         'Nesta',
      email:            'snesta@salspizzeria.com',
      phoneNumber:      '201-555-0102',
      hashedPassword:   donorPw3,
      role:             'donor',
      organizationName: "Sal's Pizzeria",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c62'),
      tags:        'pizzeria, italian, dollar slice, pizza, pasta',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0993'),
      firstName:        'Nooreen',
      lastName:         'Ahmed',
      email:            'nooreen@gmail.com',
      phoneNumber:      '201-555-0103',
      hashedPassword:   donorPw4,
      role:             'donor',
      organizationName: "Ahmed's Famous Halal Food",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c63'),
      tags:        'food cart, halal, middle eastern, rice, street food',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0994'),
      firstName:        'Vanessa',
      lastName:         'Rodriguez',
      email:            'vrodriguez@lstcs.com',
      phoneNumber:      '201-555-0104',
      hashedPassword:   donorPw5,
      role:             'donor',
      organizationName: "Los Tacos No. 2",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c64'),
      tags:        'mexcian, street food, tacos, burritos',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0995'),
      firstName:        'Julie',
      lastName:         'Ming',
      email:            'jming@bwcafe.com',
      phoneNumber:      '201-555-0105',
      hashedPassword:   donorPw6,
      role:             'donor',
      organizationName: "Bao Wow Cafe",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c65'),
      tags:        'chinese, noodles, rice, dumplings, meals',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0996'),
      firstName:        'Alexander',
      lastName:         'Jackson',
      email:            'ajackson@ajlbargrille.com',
      phoneNumber:      '201-555-0106',
      hashedPassword:   donorPw7,
      role:             'donor',
      organizationName: "A. J. Lobster Bar & Grille",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c66'),
      tags:        'seafood, fine dining, lobster, steak',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0997'),
      firstName:        'Anita',
      lastName:         'Thakur',
      email:            'athakur@vegango.com',
      phoneNumber:      '201-555-0107',
      hashedPassword:   donorPw8,
      role:             'donor',
      organizationName: "Vegan Go",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c67'),
      tags:        'vegan, healthy, salads, bowls, smoothies, diet',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0998'),
      firstName:        'Ruby',
      lastName:         'Lopez',
      email:            'rlopez@honeybeeorganics.com',
      phoneNumber:      '201-555-0108',
      hashedPassword:   donorPw9,
      role:             'donor',
      organizationName: "Honey Bee Organics",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c68'),
      tags:        'organic, gluten-free, vegan, breakfast, coffee',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69febf5c8127a82eb84c0999'),
      firstName:        'Rosetta',
      lastName:         'Stone',
      email:            'rstone@stonebakery.com',
      phoneNumber:      '201-555-0109',
      hashedPassword:   donorPw10,
      role:             'donor',
      organizationName: "Stone Bakery",
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c69'),
      tags:        'bakery, sandwiches, coffee, juices, breakfast, healthy',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    //Distributor Data
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
    // Volunteer Data
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
    // Admin Data
    {
      _id:              new ObjectId('69fecc079e9a56646629ba70'),
      firstName:        'Anthony',
      lastName:         'Santilli',
      email:            'asantill@stevens.edu',
      phoneNumber:      '201-555-0404',
      hashedPassword:   adminPw1,
      role:             'admin',
      organizationName: 'Stevens Institute of Technology',
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      tags:        'admin, moderator, staff',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69fecc079e9a56646629ba71'),
      firstName:        'Daniel',
      lastName:         'Petrovsky',
      email:            'dpetrovs1@stevens.edu',
      phoneNumber:      '201-555-0403',
      hashedPassword:   adminPw2,
      role:             'admin',
      organizationName: 'Stevens Institute of Technology',
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      tags:        'admin, moderator, staff',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69fecc079e9a56646629ba72'),
      firstName:        'Pranav',
      lastName:         'Kulkarni',
      email:            'pkulkarn1@stevens.edu',
      phoneNumber:      '201-555-0402',
      hashedPassword:   adminPw3,
      role:             'admin',
      organizationName: 'Stevens Institute of Technology',
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      tags:        'admin, moderator, staff',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
    },
    {
      _id:              new ObjectId('69fecc079e9a56646629ba73'),
      firstName:        'Zameer',
      lastName:         'Qasim',
      email:            'sqasim@stevens.edu',
      phoneNumber:      '201-555-0401',
      hashedPassword:   adminPw4,
      role:             'admin',
      organizationName: 'Stevens Institute of Technology',
      einNumber:        null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      tags:        'admin, moderator, staff',
      isSuspended: false,
      isVerified:  true,
      createdAt:   '2026-05-09T15:00:00.000Z',
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
      postedAt:        '2026-04-30T16:00:00.000Z',
      pickupStartTime: '2026-05-02T18:00:00.000Z',
      pickupEndTime:   '2026-05-02T20:00:00.000Z',
      expirationTime:  '2026-05-02T22:00:00.000Z',
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
      postedAt:        '2026-04-30T14:00:00.000Z',
      pickupStartTime: '2026-05-03T16:00:00.000Z',
      pickupEndTime:   '2026-05-03T19:00:00.000Z',
      expirationTime:  '2026-05-03T22:00:00.000Z',
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

  // ---- complaints ----

  const complaintCol = await complaintsCollection();

  const complaintDocs = [
  {
    filedById:       '222222222222222222222222',
    transactionId:   'e5e5e5e5e5e5e5e5e5e5e5e5',
    listingId:       'a1a1a1a1a1a1a1a1a1a1a1a1',
    donorId:         '111111111111111111111111',
    distributorId:   '222222222222222222222222',
    complaint:       'The pickup location was locked when we arrived and nobody was available to let us in. We waited 45 minutes and had to leave without the food.',
    status:          'open',
    isResolved:      false,
    filedAt:         '2026-04-10T18:00:00.000Z',
    resolvedAt:      null,
    resolvedBy:      null,
  },
  {
    filedById:       '111111111111111111111111',
    transactionId:   'f6f6f6f6f6f6f6f6f6f6f6f6',
    listingId:       'c3c3c3c3c3c3c3c3c3c3c3c3',
    donorId:         '111111111111111111111111',
    distributorId:   '222222222222222222222222',
    complaint:       'The distributor claimed the soup listing but has not responded to any messages in over 24 hours. The food is at risk of expiring before pickup.',
    status:          'investigation',
    isResolved:      false,
    filedAt:         '2026-04-29T20:00:00.000Z',
    resolvedAt:      null,
    resolvedBy:      null,
  },
  ];

  await complaintCol.insertMany(complaintDocs);
  console.log('seeded complaints');

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