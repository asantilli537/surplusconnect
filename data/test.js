// priority should be implemented client-side. --> remove it from view, but make sure there's a
// checker so that listings that expire or are claimed can't be claimed again

import {listings} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import * as helpers from '../helpers.js';


/* Make a new listing and put it in the database. */
export const makeNewListing = (
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

/* Get a single listing by its listing id. */
export const getListingById = (listingId) => {
    
};

/* Gets all active listings by the distributor id. */
export const getListingsByDistributor = (distributorId) => {
    

};

/* Gets all listings whose status is "active". */ 
export const getAllActiveListings = () => {
    
};

export const calcPriorityById = (id) => {

};