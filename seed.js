import {dbConnection, closeConnection} from './config/mongoConnection.js';
import {listings} from './config/mongoCollections.js';
import {ObjectId} from 'mongodb';

const main = async () => {
    const db = await dbConnection();
    await db.dropDatabase(); // oh okay so it already drops the database before seeding! very good :3

    const listingCollection = await listings();

    const listingData = [
        {
            _id: new ObjectId('64b7c2f8f1d4c3b2f8e4b1a1'),
            donorId: new ObjectId('67f5a1111111111111111111'),
            title: "Fresh bread and pastries",
            description: "Assorted bread, bagels, and pastries from today's unsold inventory.",
            status: "active",
            notes: "Pickup from rear entrance. Ask for manager on duty."
        }
    ];
};

await listingCollection.insertMany(listingData);

console.log('Seeded listing items');

await closeConnection();
main();