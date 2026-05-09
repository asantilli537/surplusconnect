import {ObjectId} from "mongodb";
import {addressesCollection} from "../config/mongoCollections.js";
import * as h from "../helpers.js";

export const getAddressByCoordinates = async (street, city, state, zipCode) => {
    if (!street || !city || !state || !zipCode) {
    throw new Error('All address fields must be provided');
  }

  street = street.trim();
  city = city.trim();
  state = state.trim();
  zipCode = zipCode.trim();

  const addressCollection = await addressesCollection();
  const existingAddress = await addressCollection.findOne({
    street: { $regex: new RegExp(`^${street}$`, 'i') },
    city: { $regex: new RegExp(`^${city}$`, 'i') },
    state: { $regex: new RegExp(`^${state}$`, 'i') },
    zipCode: zipCode 
  });

  if (existingAddress) {
    return existingAddress._id;
  }

  let address;
  try {
    address = await h.geocodeAddress(street, city, state, zipCode);
  } catch(e) {
    throw new Error(e.message);
  }

  const newAddress = {
    street: street,
    city: city,
    state: state,
    zipCode: zipCode,
    location: {
        latitude: address.latitude,
        longitude: address.longitude
    }
  };

  const insertInfo = await addressCollection.insertOne(newAddress);
  if (!insertInfo.acknowledged || !insertInfo.insertedId) {
    throw new Error('Could not add new address to the database');
  }

  return insertInfo.insertedId;
};

/*
  Return an address object based on its addressId.
  Used in the edit-listing to populate the listing's information. 
  Passes if the id is in string format. (Not an ObjectId, should be cleaned before being put through).
*/
export const getAddressById = async (id) => {
  const cleanId = h.checkAndThrowId(String(id), "addressId");
  const addresses = await addressesCollection();
  const address = await addresses.findOne({ _id: new ObjectId(cleanId) });

  if (!address) throw new Error("address not found");
  return address;
};