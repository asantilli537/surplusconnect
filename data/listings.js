// priority should be implemented client-side. --> remove it from view, but make sure there's a
// checker so that listings that expire or are claimed can't be claimed again

import {listings} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import * as helpers from '../helpers.js';
import NodeGeocoder from 'node-geocoder';


/* Make a new listing and put it in the database. */
export const makeNewListing = async (
    distributorId, // id of distributor
    title, 
    description,
    itemList,       // items list
    foodCategory,
    notes,
    addressId,
    pickupStart,
    pickupEnd
) => {
    /*
        Create a new Listing entry in the database.
    */
    distributorId = helpers.checkAndThrowId(distributorId, "distributorId");
    title = helpers.checkAndThrowString(title, 1, 50, "title");
    description = helpers.checkAndThrowString(description, 5, MAX_DESC, "description");
    itemList = parseItems(itemList);
    foodCategory = parseFoodCategory(foodCategory);
    notes = helpers.checkAndThrowString(notes, 1, MAX_DESC, "notes");
    addressId = helpers.checkAndThrowId(addressId, "addressId");
    /* TODO: pickup start and ending times (how are they formatted, how to parse?) */
    
    const listingCollection = await listings();
    let newListing = {
        distributorId,
        title,
        description,
        items: itemList,
        foodCategory,
        notes,
        addressId,
        status: "active",
        postedAt: helpers.getCurrentDateTime(),
        pickupStart: "", //TODO
        pickupEnd: "",   //TODO 
        claimedVendorId: null
    };
    const insertInfo = await listingCollection.insertOne(newListing);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw 'Could not add listing.';
    }
    const newId = insertInfo.insertedId;
    return await this.getListingById(newId.toString());
};

/* Get a single listing by its listing id. */
export const getListingById = async (id) => {
    id = helpers.checkAndThrowId(id);
    const listingCollection = await listings();
    const listing = await listingCollection.findOne({_id: new ObjectId(id)});
    if (!listing) throw 'getListingById: Listing by Id not found.';
    return listing;
};

/* Gets all listings whose status is "active" by the donor id. */
export const getListingsByDonor = async (id) => {
    id = helpers.checkAndThrowId(id);
    const listingCollection = await listings();
    let theListings = await listingCollection.find({
        donorId: id,
        status: "active"
    });
    if (!theListings) throw `getListingByDonor: Listings not found from this donor Id.`;
    return theListings.toArray();
};

/* Gets all listings whose status is "active". */ 
export const getAllActiveListings = async () => {
    const listingCollection = await listings();
    let theListings = await listingCollection.find({
        status: "active"
    });
    if (!theListings) throw `getAllActiveListings: Listings not found from this donor Id.`;
    return theListings.toArray();
};

/* Delete a listing. */
export const deleteListingById = async (id) => {
    id = helpers.checkAndThrowId(id);
    const listingCollection = await listings();
    let theListing = await listingCollection.deleteOne({_id: id});
    if (!theListing) throw `deleteListingById: Listing not found from this donor Id.`;
    return {isDeleted: true};
};

/* Claim a listing, given the listingId and the vendorId. */
export const claimListingById = async (listingId, vendorId) => {
    listingId = helpers.checkAndThrowId(listingId);
    vendorId = helpers.checkAndThrowId(vendorId);
    const listingCollection = await listings();
    let theListing = await listingCollection.find({
        _id: listingId
    });
    if (!theListings) throw `claimListingById: Listing does not exist.`;
    if (theListing.status === "claimed") throw `claimListingById: Listing is already claimed.`;
    if (theListings.status !== "active") throw `claimListingById: Listing is not active and cannot be claimed.`;

    /* TODO: time check to automatically expire listings? */

    theListing.status = "claimed";
    theListing.claimedVendorId = vendorId;
};

/* Return an object with longitude and latitude for an
   address string using node-geocoder. */
export const getLocationFromAddress = async (address) => {
    // Set options to run geocoding on the validated string.
    const options = {
        provider: 'openstreetmap'
    };
    const geocoder = NodeGeocoder(options);
    address = helpers.checkAndThrowString(address);
    let returnObject = {};
    try {
        const res_object = await geocoder.geocode(address);
        returnObject = {
            latitude: res_object.latitude,
            longitude: res_object.longitude
        };
    } catch (e) {
        throw `Location error, address is invalid.`;
    }
    return returnObject;
};

/* Input-checking, checks a list of item objects as uploaded. */
export const parseItems = (itemList) => {
    const itemKeys = ["name", "quantity", "unit"];
    const unitKeys = ["oz", "lbs", "cups", "gallons", "cans", "containers", "boxes"];
    if (!itemList.isArray || itemList === undefined || itemList === null) {
        throw `itemList is not a valid array.`;
    };

    /* Make sure all the keys of each item is there, and make sure it's an item list. */
    for (item of itemList) {
        if (typeof item !== "object" || item === undefimed || item === null) {
            throw `Entry in itemList is not a valid object.`;
        }
        if (Object.keys(itemList).every((k) => itemKeys.includes(k))) {
            throw `Entry in itemList does not have all valid keys.`;
        }
        if (Object.keys(itemList).length !== itemKeys.length) throw "Entry in itemList has extra keys.";
    }

    /* Check all the fields of the item. */
    for (item of itemList) {
        item.name = helpers.checkAndThrowString(item.name, "quantity");

        if (isNaN(item.quantity)) throw `Quantity ${item.quantity} in itemList is not a valid quantity.`;
        item.quantity = Number(item.quantity);

        item.unit = helpers.checkAndThrowString(item.unit.toLowerCase(), "unit");
        if (!unitKeys.some((e) => e === item.unit)) throw `Unit ${item.unit} in itemList is not a valid unit.`;
    }

    /* if we pass all these, return the trimmed and formatted item!*/
    return itemList;
};

/* Parse the food category section and throw if the supplied category is not in there. */
export const parseFoodCategory = (foodCategory) => {
    foodCategory = helpers.checkAndThrowString(foodCategory.toLowerCase(), "foodCategory");
    const categoryList = [
        "bakery",
        "produce",
        "dairy",
        "fish",
        "meat",
        "poultry",
        "canned",
        "nonperishable",
        "prepared",
        "other"
    ]
    if (!categoryList.includes(foodCategory)) {
        throw `foodCategory "${foodCategory}" is not a valid category.`
    }
    return foodCategory;
};