import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import {
  usersCollection,
  listingsCollection,
  transactionsCollection,
  messagesCollection,
  notificationsCollection,
  addressesCollection,
  complaintsCollection,
  receiptsCollection,
} from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

/*
  seed file for SurplusConnect. wipes the database and inserts
  realistic test data covering all four user roles, multiple listings
  in different statuses, a completed transaction with receipt,
  a chat thread, notifications, and a complaint.

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
    // original 12 addresses for donors and main distributor
    { _id: new ObjectId('69feb389a2c903a408461c60'), street: '1000 Maxwell Ln',           city: 'Hoboken',       state: 'NJ', zipCode: '07030', location: { latitude: 40.74927, longitude: -74.02562 } },
    { _id: new ObjectId('69feb389a2c903a408461c61'), street: '515 Washington St',          city: 'Hoboken',       state: 'NJ', zipCode: '07030', location: { latitude: 40.74290, longitude: -74.02905 } },
    { _id: new ObjectId('69feb389a2c903a408461c62'), street: '411 Washington St',          city: 'Jersey City',   state: 'NJ', zipCode: '07030', location: { latitude: 40.74191, longitude: -74.02946 } },
    { _id: new ObjectId('69feb389a2c903a408461c63'), street: '1221 6th Ave',               city: 'New York City', state: 'NY', zipCode: '10020', location: { latitude: 40.75944, longitude: -73.98118 } },
    { _id: new ObjectId('69feb389a2c903a408461c64'), street: '201 W 33rd St',              city: 'New York City', state: 'NY', zipCode: '10119', location: { latitude: 40.75067, longitude: -73.99134 } },
    { _id: new ObjectId('69feb389a2c903a408461c65'), street: '214 W 39th St',              city: 'New York City', state: 'NY', zipCode: '10018', location: { latitude: 40.75454, longitude: -73.98895 } },
    { _id: new ObjectId('69feb389a2c903a408461c66'), street: '424 W 33rd St',              city: 'New York City', state: 'NY', zipCode: '10001', location: { latitude: 40.75319, longitude: -73.99790 } },
    { _id: new ObjectId('69feb389a2c903a408461c67'), street: '24 W 45th St',               city: 'New York City', state: 'NY', zipCode: '10036', location: { latitude: 40.75591, longitude: -73.98082 } },
    { _id: new ObjectId('69feb389a2c903a408461c68'), street: '451 Palisade Ave',           city: 'Jersey City',   state: 'NJ', zipCode: '07307', location: { latitude: 40.74433, longitude: -74.04443 } },
    { _id: new ObjectId('69feb389a2c903a408461c69'), street: '1928 Broadway',              city: 'New York City', state: 'NY', zipCode: '10023', location: { latitude: 40.77234, longitude: -73.98188 } },
    { _id: new ObjectId('69feb389a2c903a408461c6a'), street: '1 Castle Point Terrace',    city: 'Hoboken',       state: 'NJ', zipCode: '07030', location: { latitude: 40.74503, longitude: -74.02395 } },
    { _id: new ObjectId('69feb389a2c903a408461c6b'), street: '1301 Washington St',        city: 'Hoboken',       state: 'NJ', zipCode: '07030', location: { latitude: 40.75275, longitude: -74.02585 } },
    // new addresses for additional distributors and Sofia donor
    { _id: new ObjectId('69feb389a2c903a408461c6c'), street: '6 E 32nd St',               city: 'New York City', state: 'NY', zipCode: '10016', location: { latitude: 40.74740, longitude: -73.98360 } },
    { _id: new ObjectId('69feb389a2c903a408461c6d'), street: '166 Ave of the Americas',   city: 'New York City', state: 'NY', zipCode: '10013', location: { latitude: 40.72560, longitude: -74.00460 } },
    { _id: new ObjectId('69feb389a2c903a408461c6e'), street: '300 Communipaw Ave',        city: 'Jersey City',   state: 'NJ', zipCode: '07304', location: { latitude: 40.71850, longitude: -74.06690 } },
    { _id: new ObjectId('69feb389a2c903a408461c6f'), street: '300 Bloomfield St',         city: 'Hoboken',       state: 'NJ', zipCode: '07030', location: { latitude: 40.75530, longitude: -74.02960 } },
    { _id: new ObjectId('69feb389a2c903a408461c70'), street: '494 Broad St',              city: 'Newark',        state: 'NJ', zipCode: '07102', location: { latitude: 40.73620, longitude: -74.17180 } },
    { _id: new ObjectId('69feb389a2c903a408461c71'), street: '8 E 109th St',              city: 'New York City', state: 'NY', zipCode: '10029', location: { latitude: 40.79410, longitude: -73.94760 } },
    { _id: new ObjectId('69feb389a2c903a408461c72'), street: '227 Bowery',                city: 'New York City', state: 'NY', zipCode: '10002', location: { latitude: 40.72070, longitude: -73.99280 } },
    { _id: new ObjectId('69feb389a2c903a408461c73'), street: '273 Montgomery St',         city: 'Jersey City',   state: 'NJ', zipCode: '07302', location: { latitude: 40.71660, longitude: -74.04260 } },
    { _id: new ObjectId('69feb389a2c903a408461c74'), street: '355 Food Center Dr',        city: 'Bronx',         state: 'NY', zipCode: '10474', location: { latitude: 40.81870, longitude: -73.87960 } },
    { _id: new ObjectId('69feb389a2c903a408461c75'), street: '400 Newark Ave',            city: 'Jersey City',   state: 'NJ', zipCode: '07302', location: { latitude: 40.72570, longitude: -74.04370 } },
  ];

  await addressCol.insertMany(addressDocs);
  console.log('seeded addresses');

  // ---- users ----
  // hashing all passwords in parallel with Promise.all saves ~20 seconds
  // compared to sequential awaits since bcrypt is intentionally slow

  const userCol = await usersCollection();

  const [
    donorPw1,  donorPw2,  donorPw3,  donorPw4,  donorPw5,
    donorPw6,  donorPw7,  donorPw8,  donorPw9,  donorPw10,
    donor2Pw,
    distributorPw1,  distributorPw2,  distributorPw3,  distributorPw4,  distributorPw5,
    distributorPw6,  distributorPw7,  distributorPw8,  distributorPw9,  distributorPw10,
    volunteerPw,
    adminPw1,  adminPw2,  adminPw3,  adminPw4,
  ] = await Promise.all([
    hashPw('DonorPass1!'),
    hashPw('DonorPass2@'),
    hashPw('DonorPass3#'),
    hashPw('DonorPass4$'),
    hashPw('DonorPass5%'),
    hashPw('DonorPass6^'),
    hashPw('DonorPass7&'),
    hashPw('DonorPass8*'),
    hashPw('DonorPass9('),
    hashPw('DonorPass10)'),
    hashPw('BakeryPass123!'),
    hashPw('DistPass1!'),
    hashPw('DistPass2@'),
    hashPw('DistPass3#'),
    hashPw('DistPass4$'),
    hashPw('DistPass5%'),
    hashPw('DistPass6^'),
    hashPw('DistPass7&'),
    hashPw('DistPass8*'),
    hashPw('DistPass9('),
    hashPw('DistPass10)'),
    hashPw('VolPass123!'),
    hashPw('AdminPass1!'),
    hashPw('AdminPass2@'),
    hashPw('AdminPass3#'),
    hashPw('AdminPass4$'),
  ]);

  const userDocs = [

    // ---- donors ----
    // address field stored alongside addressId so receipt generation
    // and any feature reading donor.address works correctly.
    // createUser only stores addressId so seeded users need both.

    {
      _id: new ObjectId('69febf5c8127a82eb84c0990'), firstName: 'Philip',    lastName: 'Desperaux',
      email: 'pdesperaux@mbaguette.com',    phoneNumber: '201-555-0100', hashedPassword: donorPw1,
      role: 'donor', organizationName: 'Marseille Baguette Co.', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c60'),
      address: { street: '1000 Maxwell Ln', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: 'bakery, sandwiches, desserts, coffee', isSuspended: false, isVerified: true, createdAt: '2026-04-01T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0991'), firstName: 'Joe',       lastName: 'Wazowski',
      email: 'jwazowski@sshoboken.com',     phoneNumber: '201-555-0101', hashedPassword: donorPw2,
      role: 'donor', organizationName: 'Smashed Sandwiches Hoboken', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c61'),
      address: { street: '515 Washington St', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: 'fast food, sandwiches, fries, meals', isSuspended: false, isVerified: true, createdAt: '2026-04-02T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0992'), firstName: 'Sal',       lastName: 'Nesta',
      email: 'snesta@salspizzeria.com',     phoneNumber: '201-555-0102', hashedPassword: donorPw3,
      role: 'donor', organizationName: "Sal's Pizzeria", einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c62'),
      address: { street: '411 Washington St', city: 'Jersey City', state: 'NJ', zipCode: '07030' },
      tags: 'pizzeria, italian, dollar slice, pizza, pasta', isSuspended: false, isVerified: true, createdAt: '2026-04-03T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0993'), firstName: 'Nooreen',   lastName: 'Ahmed',
      email: 'nooreen@ahmedshalal.com',     phoneNumber: '201-555-0103', hashedPassword: donorPw4,
      role: 'donor', organizationName: "Ahmed's Famous Halal Food", einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c63'),
      address: { street: '1221 6th Ave', city: 'New York City', state: 'NY', zipCode: '10020' },
      tags: 'food cart, halal, middle eastern, rice, street food', isSuspended: false, isVerified: true, createdAt: '2026-04-04T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0994'), firstName: 'Vanessa',   lastName: 'Rodriguez',
      email: 'vrodriguez@lstcs.com',        phoneNumber: '201-555-0104', hashedPassword: donorPw5,
      role: 'donor', organizationName: 'Los Tacos No. 2', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c64'),
      address: { street: '201 W 33rd St', city: 'New York City', state: 'NY', zipCode: '10119' },
      tags: 'mexican, street food, tacos, burritos', isSuspended: false, isVerified: true, createdAt: '2026-04-05T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0995'), firstName: 'Julie',     lastName: 'Ming',
      email: 'jming@bwcafe.com',            phoneNumber: '201-555-0105', hashedPassword: donorPw6,
      role: 'donor', organizationName: 'Bao Wow Cafe', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c65'),
      address: { street: '214 W 39th St', city: 'New York City', state: 'NY', zipCode: '10018' },
      tags: 'chinese, noodles, rice, dumplings, meals', isSuspended: false, isVerified: true, createdAt: '2026-04-06T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0996'), firstName: 'Alexander', lastName: 'Jackson',
      email: 'ajackson@ajlbargrille.com',   phoneNumber: '201-555-0106', hashedPassword: donorPw7,
      role: 'donor', organizationName: 'A. J. Lobster Bar & Grille', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c66'),
      address: { street: '424 W 33rd St', city: 'New York City', state: 'NY', zipCode: '10001' },
      tags: 'seafood, fine dining, lobster, steak', isSuspended: false, isVerified: true, createdAt: '2026-04-07T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0997'), firstName: 'Anita',     lastName: 'Thakur',
      email: 'athakur@vegango.com',         phoneNumber: '201-555-0107', hashedPassword: donorPw8,
      role: 'donor', organizationName: 'Vegan Go', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c67'),
      address: { street: '24 W 45th St', city: 'New York City', state: 'NY', zipCode: '10036' },
      tags: 'vegan, healthy, salads, bowls, smoothies, diet', isSuspended: false, isVerified: true, createdAt: '2026-04-08T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0998'), firstName: 'Ruby',      lastName: 'Lopez',
      email: 'rlopez@honeybeeorganics.com', phoneNumber: '201-555-0108', hashedPassword: donorPw9,
      role: 'donor', organizationName: 'Honey Bee Organics', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c68'),
      address: { street: '451 Palisade Ave', city: 'Jersey City', state: 'NJ', zipCode: '07307' },
      tags: 'organic, gluten-free, vegan, breakfast, coffee', isSuspended: false, isVerified: true, createdAt: '2026-04-09T10:00:00.000Z',
    },
    {
      _id: new ObjectId('69febf5c8127a82eb84c0999'), firstName: 'Rosetta',   lastName: 'Stone',
      email: 'rstone@stonebakery.com',      phoneNumber: '201-555-0109', hashedPassword: donorPw10,
      role: 'donor', organizationName: 'Stone Bakery', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c69'),
      address: { street: '1928 Broadway', city: 'New York City', state: 'NY', zipCode: '10023' },
      tags: 'bakery, sandwiches, coffee, juices, breakfast, healthy', isSuspended: false, isVerified: true, createdAt: '2026-04-10T10:00:00.000Z',
    },
    // 11th donor using donor2Pw - Sofia Patel from Hoboken Artisan Bakery
    {
      _id: new ObjectId('69febf5c8127a82eb84c099a'), firstName: 'Sofia',     lastName: 'Patel',
      email: 'sofia@hobokenbakery.com',     phoneNumber: '201-555-0110', hashedPassword: donor2Pw,
      role: 'donor', organizationName: 'Hoboken Artisan Bakery', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c75'),
      address: { street: '400 Newark Ave', city: 'Jersey City', state: 'NJ', zipCode: '07302' },
      tags: 'bakery, artisan, bread, pastries, coffee', isSuspended: false, isVerified: true, createdAt: '2026-04-11T10:00:00.000Z',
    },

    // ---- distributors ----
    // all 10 distributors use distributorPw1 through distributorPw10.
    // address stored alongside addressId for view compatibility.

    {
      _id: new ObjectId('69fedbf502d3e633b48e48a0'), firstName: 'Maria',     lastName: 'Chen',
      email: 'maria@communityfoodbank.org', phoneNumber: '212-555-0202', hashedPassword: distributorPw1,
      role: 'distributor', organizationName: 'Hoboken Community Center', einNumber: '13-1234567',
      addressId: new ObjectId('69feb389a2c903a408461c6b'),
      address: { street: '1301 Washington St', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-01T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a1'), firstName: 'Emma',      lastName: 'Rodriguez',
      email: 'erodriguez@cityharvest.org',  phoneNumber: '646-555-0201', hashedPassword: distributorPw2,
      role: 'distributor', organizationName: 'City Harvest NYC', einNumber: '13-2655529',
      addressId: new ObjectId('69feb389a2c903a408461c6c'),
      address: { street: '6 E 32nd St', city: 'New York City', state: 'NY', zipCode: '10016' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-02T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a2'), firstName: 'James',     lastName: 'Kim',
      email: 'jkim@godslovewedeliver.org',  phoneNumber: '212-555-0203', hashedPassword: distributorPw3,
      role: 'distributor', organizationName: "God's Love We Deliver", einNumber: '13-3071360',
      addressId: new ObjectId('69feb389a2c903a408461c6d'),
      address: { street: '166 Ave of the Americas', city: 'New York City', state: 'NY', zipCode: '10013' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-03T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a3'), firstName: 'Sarah',     lastName: 'Johnson',
      email: 'sjohnson@hudsonce.org',       phoneNumber: '201-555-0204', hashedPassword: distributorPw4,
      role: 'distributor', organizationName: 'Hudson Community Enterprises', einNumber: '22-1765432',
      addressId: new ObjectId('69feb389a2c903a408461c6e'),
      address: { street: '300 Communipaw Ave', city: 'Jersey City', state: 'NJ', zipCode: '07304' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-04T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a4'), firstName: 'Michael',   lastName: 'Walsh',
      email: 'mwalsh@hobokenshelter.org',   phoneNumber: '201-555-0205', hashedPassword: distributorPw5,
      role: 'distributor', organizationName: 'Hoboken Shelter Inc', einNumber: '22-2345678',
      addressId: new ObjectId('69feb389a2c903a408461c6f'),
      address: { street: '300 Bloomfield St', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-05T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a5'), firstName: 'Ana',       lastName: 'Santos',
      email: 'asantos@ccarchdiocesenewark.org', phoneNumber: '973-555-0206', hashedPassword: distributorPw6,
      role: 'distributor', organizationName: 'Catholic Charities Diocese of Newark', einNumber: '22-1500064',
      addressId: new ObjectId('69feb389a2c903a408461c70'),
      address: { street: '494 Broad St', city: 'Newark', state: 'NJ', zipCode: '07102' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-06T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a6'), firstName: 'Tom',       lastName: 'Murphy',
      email: 'tmurphy@nycommonpantry.org',  phoneNumber: '212-555-0207', hashedPassword: distributorPw7,
      role: 'distributor', organizationName: 'NY Common Pantry', einNumber: '13-1944032',
      addressId: new ObjectId('69feb389a2c903a408461c71'),
      address: { street: '8 E 109th St', city: 'New York City', state: 'NY', zipCode: '10029' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-07T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a7'), firstName: 'Patricia',  lastName: 'Grant',
      email: 'pgrant@bowerymission.org',    phoneNumber: '212-555-0208', hashedPassword: distributorPw8,
      role: 'distributor', organizationName: 'The Bowery Mission', einNumber: '13-6122252',
      addressId: new ObjectId('69feb389a2c903a408461c72'),
      address: { street: '227 Bowery', city: 'New York City', state: 'NY', zipCode: '10002' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-08T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a8'), firstName: 'David',     lastName: 'Park',
      email: 'dpark@jcmutualaid.org',       phoneNumber: '201-555-0209', hashedPassword: distributorPw9,
      role: 'distributor', organizationName: 'Jersey City Mutual Aid Network', einNumber: '22-3456789',
      addressId: new ObjectId('69feb389a2c903a408461c73'),
      address: { street: '273 Montgomery St', city: 'Jersey City', state: 'NJ', zipCode: '07302' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-09T11:00:00.000Z',
    },
    {
      _id: new ObjectId('69fedbf502d3e633b48e48a9'), firstName: 'Carmen',    lastName: 'Rivera',
      email: 'crivera@bronxfooddist.org',   phoneNumber: '718-555-0210', hashedPassword: distributorPw10,
      role: 'distributor', organizationName: 'Bronx Community Food Distribution', einNumber: '13-4567890',
      addressId: new ObjectId('69feb389a2c903a408461c74'),
      address: { street: '355 Food Center Dr', city: 'Bronx', state: 'NY', zipCode: '10474' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-10T11:00:00.000Z',
    },

    // ---- volunteer ----
    {
      _id: new ObjectId('333333333333333333333333'), firstName: 'Kevin',     lastName: 'Park',
      email: 'kevin@volunteer.com',         phoneNumber: '917-555-0303', hashedPassword: volunteerPw,
      role: 'volunteer', organizationName: null, einNumber: null,
      address: { street: '500 Washington St', city: 'Jersey City', state: 'NJ', zipCode: '07302' },
      tags: '', isSuspended: false, isVerified: true, createdAt: '2026-04-02T09:00:00.000Z',
    },

    // ---- admins ----
    {
      _id: new ObjectId('69fecc079e9a56646629ba70'), firstName: 'Anthony',   lastName: 'Santilli',
      email: 'asantill@stevens.edu',        phoneNumber: '201-555-0404', hashedPassword: adminPw1,
      role: 'admin', organizationName: 'Stevens Institute of Technology', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      address: { street: '1 Castle Point Terrace', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: 'admin, moderator, staff', isSuspended: false, isVerified: true, createdAt: '2026-05-09T15:00:00.000Z',
    },
    {
      _id: new ObjectId('69fecc079e9a56646629ba71'), firstName: 'Daniel',    lastName: 'Petrovsky',
      email: 'dpetrovs1@stevens.edu',       phoneNumber: '201-555-0403', hashedPassword: adminPw2,
      role: 'admin', organizationName: 'Stevens Institute of Technology', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      address: { street: '1 Castle Point Terrace', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: 'admin, moderator, staff', isSuspended: false, isVerified: true, createdAt: '2026-05-09T15:00:00.000Z',
    },
    {
      _id: new ObjectId('69fecc079e9a56646629ba72'), firstName: 'Pranav',    lastName: 'Kulkarni',
      email: 'pkulkarn1@stevens.edu',       phoneNumber: '201-555-0402', hashedPassword: adminPw3,
      role: 'admin', organizationName: 'Stevens Institute of Technology', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      address: { street: '1 Castle Point Terrace', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: 'admin, moderator, staff', isSuspended: false, isVerified: true, createdAt: '2026-05-09T15:00:00.000Z',
    },
    {
      _id: new ObjectId('69fecc079e9a56646629ba73'), firstName: 'Sarah',     lastName: 'Mitchell',
      email: 'sarah@surplusconnect-admin.com', phoneNumber: '201-555-0401', hashedPassword: adminPw4,
      role: 'admin', organizationName: 'SurplusConnect', einNumber: null,
      addressId: new ObjectId('69feb389a2c903a408461c6a'),
      address: { street: '1 Castle Point Terrace', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      tags: 'admin, moderator, staff', isSuspended: false, isVerified: true, createdAt: '2026-05-09T15:00:00.000Z',
    },
  ];

  await userCol.insertMany(userDocs);
  console.log('seeded users');

  // ---- listings ----
  // delivered listing uses April dates. all active listings use
  // May 11-12 dates so countdown timers show correctly during the walkthrough.
  // each listing stores both addressId (for map/proximity feature) and
  // pickupAddress embedded (for listing card and view display).

  const listingCol = await listingsCollection();

  const listingDocs = [
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d10'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0990'),
      title:           'Fresh sandwiches, wraps, and coffee',
      description:     'Turkey, chicken and veg sandwiches, veggie wraps, and iced americano coffee. All made this afternoon.',
      items: [
        { name: 'Turkey sandwiches',  quantity: 12, unit: 'pieces'  },
        { name: 'Chicken sandwiches', quantity: 6,  unit: 'pieces'  },
        { name: 'Veg sandwiches',     quantity: 8,  unit: 'pieces'  },
        { name: 'Rainbow wraps',      quantity: 10, unit: 'pieces'  },
        { name: 'Iced americano',     quantity: 3,  unit: 'gallons' },
      ],
      foodCategory:    'prepared',
      notes:           'Bring your own containers. Container provided only for the coffee. Ask for Philip at the front desk.',
      addressId:       new ObjectId('69feb389a2c903a408461c60'),
      pickupAddress:   { street: '1000 Maxwell Ln', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      status:          'delivered',
      postedAt:        '2026-04-10T10:00:00.000Z',
      pickupStartTime: '2026-04-10T13:00:00.000Z',
      pickupEndTime:   '2026-04-10T16:00:00.000Z',
      expirationTime:  '2026-04-10T18:00:00.000Z',
      deliveredAt:     '2026-04-10T16:30:00.000Z',
      claimedById:     new ObjectId('69fedbf502d3e633b48e48a0'),
      priorityScore:   85,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d11'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0991'),
      title:           'Surplus Sandwiches and Fries',
      description:     'Smashed chicken sandwiches and trays of fries from our lunch rush.',
      items: [
        { name: 'Assorted Sandwiches', quantity: 15, unit: 'pieces' },
        { name: 'French Fries',        quantity: 3,  unit: 'trays'  },
      ],
      foodCategory:    'prepared',
      notes:           'Please bring a large insulated bag. Ask for Joe at the side door.',
      addressId:       new ObjectId('69feb389a2c903a408461c61'),
      pickupAddress:   { street: '515 Washington St', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      status:          'active',
      postedAt:        '2026-05-09T14:00:00.000Z',
      pickupStartTime: '2026-05-11T16:00:00.000Z',
      pickupEndTime:   '2026-05-11T19:00:00.000Z',
      expirationTime:  '2026-05-11T21:00:00.000Z',
      claimedById:     null,
      priorityScore:   45,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d12'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0992'),
      title:           'End of Day Pizza Slices',
      description:     'Leftover cheese and pepperoni slices kept warm under the counter.',
      items: [
        { name: 'Cheese Slices',    quantity: 20, unit: 'pieces' },
        { name: 'Pepperoni Slices', quantity: 15, unit: 'pieces' },
        { name: 'Garlic Knots',     quantity: 40, unit: 'pieces' },
      ],
      foodCategory:    'prepared',
      notes:           'Boxed up and ready to go. Park out front with your flashers on. Ask for Sal.',
      addressId:       new ObjectId('69feb389a2c903a408461c62'),
      pickupAddress:   { street: '411 Washington St', city: 'Jersey City', state: 'NJ', zipCode: '07030' },
      status:          'active',
      postedAt:        '2026-05-09T14:30:00.000Z',
      pickupStartTime: '2026-05-11T22:00:00.000Z',
      pickupEndTime:   '2026-05-11T23:30:00.000Z',
      expirationTime:  '2026-05-12T01:00:00.000Z',
      claimedById:     null,
      priorityScore:   55,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d13'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0993'),
      title:           'Chicken and Rice Platters',
      description:     'Freshly made chicken over yellow rice with salad.',
      items: [
        { name: 'Chicken and Rice Platters', quantity: 25, unit: 'servings' },
        { name: 'Pita Bread',                quantity: 30, unit: 'pieces'   },
      ],
      foodCategory:    'prepared',
      notes:           'Food cart is parked on the corner of 6th Ave. Look for the yellow umbrella.',
      addressId:       new ObjectId('69feb389a2c903a408461c63'),
      pickupAddress:   { street: '1221 6th Ave', city: 'New York City', state: 'NY', zipCode: '10020' },
      status:          'active',
      postedAt:        '2026-05-09T15:00:00.000Z',
      pickupStartTime: '2026-05-11T18:00:00.000Z',
      pickupEndTime:   '2026-05-11T20:00:00.000Z',
      expirationTime:  '2026-05-11T21:30:00.000Z',
      claimedById:     null,
      priorityScore:   65,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d14'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0994'),
      title:           'Assorted Tacos and Sides',
      description:     'Cancelled catering order. Beef and chicken tacos with sides of beans and rice.',
      items: [
        { name: 'Beef Tacos',    quantity: 40, unit: 'pieces'  },
        { name: 'Chicken Tacos', quantity: 35, unit: 'pieces'  },
        { name: 'Black Beans',   quantity: 2,  unit: 'gallons' },
      ],
      foodCategory:    'prepared',
      notes:           'Heavy trays! Bring a cart if possible.',
      addressId:       new ObjectId('69feb389a2c903a408461c64'),
      pickupAddress:   { street: '201 W 33rd St', city: 'New York City', state: 'NY', zipCode: '10119' },
      status:          'active',
      postedAt:        '2026-05-09T13:45:00.000Z',
      pickupStartTime: '2026-05-11T15:30:00.000Z',
      pickupEndTime:   '2026-05-11T17:30:00.000Z',
      expirationTime:  '2026-05-11T19:00:00.000Z',
      claimedById:     null,
      priorityScore:   85,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d15'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0995'),
      title:           'Dumplings and Lo Mein',
      description:     'Excess prep from our morning shift. All securely packaged in takeout containers.',
      items: [
        { name: 'Pork Dumplings',    quantity: 80, unit: 'pieces' },
        { name: 'Vegetable Lo Mein', quantity: 5,  unit: 'trays'  },
      ],
      foodCategory:    'prepared',
      notes:           'Containers are stacked in the walk-in fridge.',
      addressId:       new ObjectId('69feb389a2c903a408461c65'),
      pickupAddress:   { street: '214 W 39th St', city: 'New York City', state: 'NY', zipCode: '10018' },
      status:          'active',
      postedAt:        '2026-05-09T15:15:00.000Z',
      pickupStartTime: '2026-05-11T17:00:00.000Z',
      pickupEndTime:   '2026-05-11T20:00:00.000Z',
      expirationTime:  '2026-05-11T22:00:00.000Z',
      claimedById:     null,
      priorityScore:   50,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d16'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0996'),
      title:           'Gourmet Seafood Bisque and Rolls',
      description:     'High-quality lobster bisque and house-baked dinner rolls.',
      items: [
        { name: 'Lobster Bisque', quantity: 3,  unit: 'gallons' },
        { name: 'Dinner Rolls',   quantity: 50, unit: 'pieces'  },
      ],
      foodCategory:    'prepared',
      notes:           'Please come to the rear loading dock. Ring the buzzer for the kitchen.',
      addressId:       new ObjectId('69feb389a2c903a408461c66'),
      pickupAddress:   { street: '424 W 33rd St', city: 'New York City', state: 'NY', zipCode: '10001' },
      status:          'active',
      postedAt:        '2026-05-09T16:00:00.000Z',
      pickupStartTime: '2026-05-11T22:30:00.000Z',
      pickupEndTime:   '2026-05-11T23:45:00.000Z',
      expirationTime:  '2026-05-12T02:00:00.000Z',
      claimedById:     null,
      priorityScore:   35,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d17'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0997'),
      title:           'Fresh Vegan Bowls',
      description:     'Pre-packaged quinoa and kale salad bowls. Completely vegan and nut-free.',
      items: [
        { name: 'Quinoa Salad Bowls', quantity: 18, unit: 'servings' },
        { name: 'Green Smoothies',    quantity: 12, unit: 'pieces'   },
      ],
      foodCategory:    'prepared',
      notes:           'Keep refrigerated upon pickup.',
      addressId:       new ObjectId('69feb389a2c903a408461c67'),
      pickupAddress:   { street: '24 W 45th St', city: 'New York City', state: 'NY', zipCode: '10036' },
      status:          'active',
      postedAt:        '2026-05-09T14:45:00.000Z',
      pickupStartTime: '2026-05-11T16:00:00.000Z',
      pickupEndTime:   '2026-05-11T18:00:00.000Z',
      expirationTime:  '2026-05-12T12:00:00.000Z',
      claimedById:     null,
      priorityScore:   25,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d18'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0998'),
      title:           'Organic Gluten-Free Muffins',
      description:     'A mix of blueberry and banana nut gluten-free muffins baked this morning.',
      items: [
        { name: 'Blueberry Muffins',  quantity: 24, unit: 'pieces' },
        { name: 'Banana Nut Muffins', quantity: 12, unit: 'pieces' },
      ],
      foodCategory:    'bakery',
      notes:           'Packaged in two large cardboard bakery boxes.',
      addressId:       new ObjectId('69feb389a2c903a408461c68'),
      pickupAddress:   { street: '451 Palisade Ave', city: 'Jersey City', state: 'NJ', zipCode: '07307' },
      status:          'active',
      postedAt:        '2026-05-09T11:00:00.000Z',
      pickupStartTime: '2026-05-11T14:00:00.000Z',
      pickupEndTime:   '2026-05-11T17:00:00.000Z',
      expirationTime:  '2026-05-13T10:00:00.000Z',
      claimedById:     null,
      priorityScore:   20,
    },
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d19'),
      donorId:         new ObjectId('69febf5c8127a82eb84c0999'),
      title:           'Fresh Baked Bread and Pastries',
      description:     "Unsold sourdough loaves and croissants from today's display.",
      items: [
        { name: 'Sourdough Loaves',          quantity: 10, unit: 'pieces'  },
        { name: 'Butter Croissants',         quantity: 25, unit: 'pieces'  },
        { name: 'Cold Pressed Orange Juice', quantity: 5,  unit: 'gallons' },
      ],
      foodCategory:    'bakery',
      notes:           'Bags provided, but a crate would help for the juice jugs.',
      addressId:       new ObjectId('69feb389a2c903a408461c69'),
      pickupAddress:   { street: '1928 Broadway', city: 'New York City', state: 'NY', zipCode: '10023' },
      status:          'active',
      postedAt:        '2026-05-09T15:30:00.000Z',
      pickupStartTime: '2026-05-11T18:00:00.000Z',
      pickupEndTime:   '2026-05-11T20:30:00.000Z',
      expirationTime:  '2026-05-12T15:00:00.000Z',
      claimedById:     null,
      priorityScore:   30,
    },
    // Sofia's listing - 11th donor
    {
      _id:             new ObjectId('69ff4a66a68cde75eba72d1a'),
      donorId:         new ObjectId('69febf5c8127a82eb84c099a'),
      title:           'Artisan Croissants and Fruit Tarts',
      description:     'Freshly baked butter croissants and seasonal fruit tarts from this morning.',
      items: [
        { name: 'Butter Croissants', quantity: 30, unit: 'pieces' },
        { name: 'Fruit Tarts',       quantity: 18, unit: 'pieces' },
        { name: 'Almond Croissants', quantity: 12, unit: 'pieces' },
      ],
      foodCategory:    'bakery',
      notes:           'Pick up at the bakery back entrance. Ring the bell.',
      addressId:       new ObjectId('69feb389a2c903a408461c75'),
      pickupAddress:   { street: '400 Newark Ave', city: 'Jersey City', state: 'NJ', zipCode: '07302' },
      status:          'active',
      postedAt:        '2026-05-09T09:00:00.000Z',
      pickupStartTime: '2026-05-11T13:00:00.000Z',
      pickupEndTime:   '2026-05-11T16:00:00.000Z',
      expirationTime:  '2026-05-11T18:00:00.000Z',
      claimedById:     null,
      priorityScore:   60,
    },
  ];

  await listingCol.insertMany(listingDocs);
  console.log('seeded listings');

  // ---- transactions ----
  // storing IDs as strings to match how the verify-pin route
  // queries transactions using string comparisons

  const txCol = await transactionsCollection();

  const txDocs = [
    {
      _id:           new ObjectId('e5e5e5e5e5e5e5e5e5e5e5e5'),
      listingId:     '69ff4a66a68cde75eba72d10',
      donorId:       '69febf5c8127a82eb84c0990',
      distributorId: '69fedbf502d3e633b48e48a0',
      status:        'delivered',
      pickupPin:     '4821',
      claimedAt:     '2026-04-10T13:00:00.000Z',
      completedAt:   '2026-04-10T16:30:00.000Z',
      receiptSent:   true,
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
      donorId:       '69febf5c8127a82eb84c0990',
      distributorId: '69fedbf502d3e633b48e48a0',
      isReadOnly:    true,
      lockedAt:      '2026-04-10T16:30:00.000Z',
      messages: [
        {
          _id:        new ObjectId(),
          senderId:   '69fedbf502d3e633b48e48a0',
          senderName: 'Maria Chen',
          content:    'Hi Philip! We just claimed your listing. What time works best for pickup?',
          timestamp:  '2026-04-10T13:05:00.000Z',
        },
        {
          _id:        new ObjectId(),
          senderId:   '69febf5c8127a82eb84c0990',
          senderName: 'Philip Desperaux',
          content:    'Hey Maria! Anytime between 2 and 5 works great. Ask for me at the front desk.',
          timestamp:  '2026-04-10T13:12:00.000Z',
        },
        {
          _id:        new ObjectId(),
          senderId:   '69fedbf502d3e633b48e48a0',
          senderName: 'Maria Chen',
          content:    'Perfect, we will be there around 3pm. Thank you so much!',
          timestamp:  '2026-04-10T13:18:00.000Z',
        },
      ],
      createdAt: '2026-04-10T13:00:00.000Z',
    },
  ];

  await msgCol.insertMany(msgDocs);
  console.log('seeded messages');

  // ---- notifications ----

  const notifCol = await notificationsCollection();

  const notifDocs = [
    {
      userId:   '69febf5c8127a82eb84c0990',
      type:     'listing_claimed',
      message:  'Hoboken Community Center claimed your listing "Fresh sandwiches, wraps, and coffee"',
      isRead:   true,
      sentTime: '2026-04-10T13:00:00.000Z',
    },
    {
      userId:   '69febf5c8127a82eb84c0990',
      type:     'receipt_generated',
      message:  'Your donation receipt for "Fresh sandwiches, wraps, and coffee" is ready to view in your donation history.',
      isRead:   false,
      sentTime: '2026-04-10T16:30:00.000Z',
    },
    {
      userId:   '69fedbf502d3e633b48e48a0',
      type:     'pickup_scheduled',
      message:  'You claimed "Fresh sandwiches, wraps, and coffee". Ask the donor for their 4-digit PIN to confirm the handoff.',
      isRead:   true,
      sentTime: '2026-04-10T13:00:00.000Z',
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
      filedById:     '69fedbf502d3e633b48e48a0',
      transactionId: 'e5e5e5e5e5e5e5e5e5e5e5e5',
      listingId:     '69ff4a66a68cde75eba72d10',
      donorId:       '69febf5c8127a82eb84c0990',
      distributorId: '69fedbf502d3e633b48e48a0',
      complaint:     'The pickup location was locked when we arrived and nobody was available to let us in. We waited 45 minutes and had to leave without the food.',
      status:        'open',
      isResolved:    false,
      filedAt:       '2026-04-10T18:00:00.000Z',
      resolvedAt:    null,
      resolvedBy:    null,
    },
  ];

  await complaintCol.insertMany(complaintDocs);
  console.log('seeded complaints');

  // ---- receipts ----
  // seeding one receipt for Philip's delivered listing so his donation
  // history page shows the view receipt button immediately without
  // needing to run a complete delivery flow first

  const receiptCol = await receiptsCollection();

  const receiptDocs = [
    {
      receiptNumber:  'SC-2026-48210',
      listingId:      '69ff4a66a68cde75eba72d10',
      transactionId:  'e5e5e5e5e5e5e5e5e5e5e5e5',
      donorId:        '69febf5c8127a82eb84c0990',
      distributorId:  '69fedbf502d3e633b48e48a0',
      donorDetails: {
        firstName:        'Philip',
        lastName:         'Desperaux',
        organizationName: 'Marseille Baguette Co.',
        email:            'pdesperaux@mbaguette.com',
        address: { street: '1000 Maxwell Ln', city: 'Hoboken', state: 'NJ', zipCode: '07030' },
      },
      distributorDetails: {
        firstName:        'Maria',
        lastName:         'Chen',
        organizationName: 'Hoboken Community Center',
        einNumber:        '13-1234567',
        email:            'maria@communityfoodbank.org',
      },
      donationDetails: {
        title:        'Fresh sandwiches, wraps, and coffee',
        description:  'Turkey, chicken and veg sandwiches, veggie wraps, and iced americano coffee.',
        foodCategory: 'prepared',
        items: [
          { name: 'Turkey sandwiches',  quantity: 12, unit: 'pieces'  },
          { name: 'Chicken sandwiches', quantity: 6,  unit: 'pieces'  },
          { name: 'Veg sandwiches',     quantity: 8,  unit: 'pieces'  },
          { name: 'Rainbow wraps',      quantity: 10, unit: 'pieces'  },
          { name: 'Iced americano',     quantity: 3,  unit: 'gallons' },
        ],
        totalItems:  39,
        pickupDate:  '2026-04-10T16:30:00.000Z',
        notes:       'Bring your own containers. Container provided only for the coffee.',
      },
      taxStatement: 'This letter acknowledges that Marseille Baguette Co. made a charitable food donation to Hoboken Community Center, a tax-exempt organization under IRS Section 501(c)(3) with EIN 13-1234567, on April 10, 2026. No goods or services were provided in exchange for this donation.',
      issuedAt:     '2026-04-10T16:30:00.000Z',
    },
  ];

  await receiptCol.insertMany(receiptDocs);
  console.log('seeded receipts');

  console.log('');
  console.log('---- seed complete ----');
  console.log('');
  console.log('test accounts:');
  console.log('  donor:        pdesperaux@mbaguette.com        / DonorPass1!');
  console.log('  donor 2:      sofia@hobokenbakery.com          / BakeryPass123!');
  console.log('  distributor:  maria@communityfoodbank.org     / DistPass1!');
  console.log('  distributor2: erodriguez@cityharvest.org      / DistPass2@');
  console.log('  volunteer:    kevin@volunteer.com              / VolPass123!');
  console.log('  admin:        sarah@surplusconnect-admin.com  / AdminPass4$');

  await closeConnection();
};

main().catch(async (e) => {
  console.error('seed failed:', e);
  await closeConnection();
  process.exit(1);
});