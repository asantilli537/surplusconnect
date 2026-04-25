import {dbConnection, closeConnection} from './config/mongoConnection.js';
import {listings, addresses} from './config/mongoCollections.js';
import {ObjectId} from 'mongodb';

const main = async () => {
    const db = await dbConnection();
    await db.dropDatabase();

    const listingCollection = await listings();
    const addressCollection = await addresses();
    const receiptData = await receipts();
    const transactionData = await transactions();

    const listingData = [
        {
            _id: new ObjectId('64b7c2f8f1d4c3b2f8e4b1a1'),
            donorId: new ObjectId('67f5a1111111111111111111'),
            title: "Fresh bread and pastries",
            description: "Assorted bread, bagels, and pastries from today's unsold inventory.",
            items: [
                {
                    name: "Bagels",
                    quantity: 24,
                    unit: "pieces" // pieces, oz, lbs, gallons, cups?
                },
                {
                    name: "Croissants",
                    quantity: 12,
                    unit: "pieces"
                },
            ],
            foodCategory: "bakery",
            notes: "Pickup from rear entrance. Ask for manager on duty.",
            addressId: new ObjectId("69ea7e3825c5276bf368afe5"),
            status: "active",
            postedAt: "2026-04-01T11:09:00.000Z",
            pickupStart: "2026-04-01T12:00:00.000Z",
            pickupEnd: "2026-04-01T16:00:00.000Z",
            claimedVendorId: null
        },
        {
            _id: new ObjectId(),
            donorId: new ObjectId('67f5a1111111111111111111'),
            title: "Milk and cream",
            description: "Fresh, unopened milk and cream from this week's inventory",
            items: [
                {
                    name: "Milk",
                    quantity: 2,
                    unit: "gallons" // pieces, oz, lbs, gallons, cups?
                },
                {
                    name: "Cream",
                    quantity: 1,
                    unit: "gallons"
                },
            ],
            foodCategory: "dairy", // bakery, produce, dairy, fish, meat, poultry, prepared, other?
            notes: "Pickup from rear entrance. Ask for manager on duty.",
            addressId: new ObjectId("69ea7e3825c5276bf368afe5"),
            status: "active",
            postedAt: "2026-04-02T10:12:00.000Z",
            pickupStart: "2026-04-02T11:00:00.000Z",
            pickupEnd: "2026-04-02T16:00:00.000Z",
            claimedVendorId: null
        }
    ];

    const addressData = [
        {
            _id: new ObjectId("69ea7e3825c5276bf368afe5"),
            line1: "1 River St",
            line2: null,
            city: "Hoboken",
            state: "NJ",
            zipcode: "07030",
            location:
            {
                latitude: 40.7440,
                longitude: -74.0324
            }
        }
    ];
};

await listingCollection.insertMany(listingData);
await addressCollection.insertMany(addressData);

console.log('Seeded listing items');

await closeConnection();
main();