// priority should be implemented client-side. --> remove it from view, but make sure there's a
// checker so that listings that expire or are claimed can't be claimed again

import {listings} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';


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
        Claim an available listing by its Id.
    */
    
};

export const parseItems = (itemList) => {
    /* Checks a list of item objects. */

};

export const calcPriorityById = (id) => {

};