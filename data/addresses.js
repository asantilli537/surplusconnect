import {ObjectId} from "mongodb";
import {addressesCollection} from "../config/mongoCollections.js";
import * as helpers from "../helpers.js";

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
    address = await helpers.geocodeAddress(street, city, state, zipCode);
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