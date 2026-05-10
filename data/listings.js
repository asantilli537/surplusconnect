import { ObjectId } from "mongodb";
import {
  listingsCollection,
  transactionsCollection,
  usersCollection,
  addressesCollection,
} from "../config/mongoCollections.js";
import { createThread } from "./messages.js";
import { createNotification } from "./notifications.js";
import { getAllUsers } from "./users.js";
import { getAddressByCoordinates } from "./addresses.js";
import * as h from "../helpers.js";
import { createReceipt } from "./receipts.js";
import { getUserById } from "./users.js";
import { getAddressById } from "./addresses.js";

/*
  listings are the core of SurplusConnect. donors create them,
  distributors browse and claim them, and the system tracks each
  one through active, claimed, delivered, cancelled, and expired.
*/

const validStatuses = [
  "active",
  "claimed",
  "delivered",
  "cancelled",
  "expired",
];
const validCategories = [
  "bakery",
  "produce",
  "dairy",
  "meat",
  "prepared",
  "pantry",
  "beverages",
  "other",
];
const validUnits = [
  "pieces",
  "trays",
  "pounds",
  "boxes",
  "bags",
  "gallons",
  "servings",
  "oz",
  "lbs",
  "cups",
  "cans",
  "containers",
];

// ---- internal helpers ----

/*
  validating and cleaning the items array. each item needs a name,
  a positive numeric quantity, and a unit from the allowed list.
  throwing early so bad data never reaches the database.
*/
const parseAndValidateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("at least one food item is required");
  }
  if (items.length > 50) {
    throw new Error("listing cannot have more than 50 items");
  }

  return items.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`item at index ${idx} must be an object`);
    }

    const name = h.checkAndThrowString(item.name, `item[${idx}].name`, 1, 100);

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isFinite(qty)) {
      throw new Error(`item[${idx}].quantity must be a positive number`);
    }
    if (qty > 5000) {
      throw new Error(`item[${idx}].quantity is unrealistically large`);
    }

    const unit = h.checkAndThrowString(item.unit, `item[${idx}].unit`, 1, 20);
    if (!validUnits.includes(unit.toLowerCase())) {
      throw new Error(
        `item[${idx}].unit must be one of: ${validUnits.join(", ")}`,
      );
    }

    return {
      name: h.sanitize(name),
      quantity: qty,
      unit: unit.toLowerCase(),
    };
  });
};

const parseAndValidateCategory = (category) => {
  const clean = h.checkAndThrowString(category, "foodCategory", 1, 50);
  if (!validCategories.includes(clean.toLowerCase())) {
    throw new Error(
      `foodCategory must be one of: ${validCategories.join(", ")}`,
    );
  }
  return clean.toLowerCase();
};

const parseAndValidateDatetime = (value, fieldName) => {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  const parsed = new Date(value.trim());
  if (isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date and time`);
  }
  return parsed.toISOString();
};

/*
  calculating a basic priority score when a listing is created.
  higher score surfaces the listing higher in the browse list.
  combining urgency (time until expiry) and quantity impact.
  scores range from 0 to 100.
*/
const calculatePriorityScore = (expirationTime, items) => {
  const hoursUntilExpiry =
    (new Date(expirationTime) - new Date()) / (1000 * 60 * 60);

  // closer to expiring means more urgent, contributes up to 50 points
  let urgencyScore = 0;
  if (hoursUntilExpiry <= 2) urgencyScore = 50;
  else if (hoursUntilExpiry <= 6) urgencyScore = 35;
  else if (hoursUntilExpiry <= 12) urgencyScore = 20;
  else if (hoursUntilExpiry <= 24) urgencyScore = 10;
  else urgencyScore = 5;

  // more items means more community impact, contributes up to 50 points
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  let qtyScore = 0;
  if (totalQty >= 100) qtyScore = 50;
  else if (totalQty >= 50) qtyScore = 35;
  else if (totalQty >= 20) qtyScore = 20;
  else if (totalQty >= 10) qtyScore = 10;
  else qtyScore = 5;

  return Math.min(urgencyScore + qtyScore, 100);
};

// ---- generatePickupPin ----

/*
  generating a zero-padded 4-digit PIN for physical pickup verification.
  stored as a string so leading zeros are preserved.
  0847 as a number becomes 847 which would break string comparison.
*/
const generatePickupPin = () => {
  const pin = Math.floor(Math.random() * 9000) + 1000;
  return String(pin);
};

// ---- createListing ----

/*
  called when a donor submits the listing create form.
  validates every field, calculates the initial priority score,
  and inserts the document. throws on any invalid input before
  touching the database.
*/
export const createListing = async (donorId, listingData) => {
  /* Input Validation */
  const cleanDonorId = h.checkAndThrowId(String(donorId), 'donorId');

  // verifying the donor account exists, is actually a donor role, and is
  // not suspended before creating any listing documents. this prevents
  // orphaned listings if an account is deleted and stops suspended donors
  // from posting new listings even if they somehow bypass route middleware.
  const userCol = await usersCollection();
  const donor   = await userCol.findOne(
    { _id: new ObjectId(cleanDonorId), role: 'donor', isSuspended: false },
    { projection: { _id: 1 } }
  );
  if (!donor) {
    throw new Error('donor account not found or is not eligible to post listings');
  }

  if (!listingData || typeof listingData !== "object") {
    throw new Error("listing data is required");
  }

  const {
    title,
    description,
    items,
    foodCategory,
    notes,
    pickupStartTime,
    pickupEndTime,
    expirationTime,
    street,
    city,
    state,
    zipCode,
  } = listingData;

  const cleanTitle = h.checkAndThrowString(title, "title", 2, 100);
  const cleanCategory = parseAndValidateCategory(foodCategory);
  const cleanItems = parseAndValidateItems(items);

  // description and notes are optional but sanitized if provided
  const cleanDesc = description
    ? h.sanitize(
        h.checkAndThrowString(String(description), "description", 1, 1000),
      )
    : "";
  const cleanNotes = notes
    ? h.sanitize(h.checkAndThrowString(String(notes), "notes", 1, 500))
    : "";

  const cleanStart = parseAndValidateDatetime(
    pickupStartTime,
    "pickupStartTime",
  );
  const cleanEnd = parseAndValidateDatetime(pickupEndTime, "pickupEndTime");
  const cleanExpiry = parseAndValidateDatetime(
    expirationTime,
    "expirationTime",
  );

  // making sure the time sequence makes logical sense
  if (new Date(cleanStart) <= new Date()) {
    throw new Error("pickup start time must be in the future");
  }
  if (new Date(cleanStart) >= new Date(cleanEnd)) {
    throw new Error("pickup end time must be after pickup start time");
  }
  if (new Date(cleanExpiry) < new Date(cleanEnd)) {
    throw new Error("expiration time cannot be before the pickup window ends");
  }

  // validating the pickup address fields
  const cleanStreet = h.checkAndThrowString(street, "street", 2, 200);
  const cleanCity = h.checkAndThrowString(city, "city", 2, 100);
  const cleanState = h.checkAndThrowState(state);
  const cleanZip = h.checkAndThrowZip(zipCode);

  const listings = await listingsCollection();

  const newAddressId = await getAddressByCoordinates(
    cleanStreet,
    cleanCity,
    cleanState,
    cleanZip,
  );

  const newListing = {
    donorId: new ObjectId(cleanDonorId),
    title: h.sanitize(cleanTitle),
    description: cleanDesc,
    items: cleanItems,
    foodCategory: cleanCategory,
    notes: cleanNotes,
    addressId: newAddressId,
    status: "active",
    postedAt: new Date().toISOString(),
    pickupStartTime: cleanStart,
    pickupEndTime: cleanEnd,
    expirationTime: cleanExpiry,
    claimedById: null,
    priorityScore: calculatePriorityScore(cleanExpiry, cleanItems),
  };

  const result = await listings.insertOne(newListing);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error("failed to create listing");
  }

  // notifying distributors that a new listing is available
  // wrapping in try/catch so a notification failure never blocks listing creation
  try {
    const distributors = await getAllUsers({ role: "distributor" });
    const notificationPromises = distributors.map((dist) =>
      createNotification(
        dist._id.toString(),
        "new_listing_nearby",
        `new listing available nearby: "${newListing.title}"`,
      ),
    );
    await Promise.all(notificationPromises);
  } catch (e) {
    console.error(
      "distributor notifications failed after listing create:",
      e.message,
    );
  }

  return await getListingById(result.insertedId.toString());
};

// ---- getListingById ----

export const getListingById = async (id) => {
  /* Input Validation */
  const cleanId = h.checkAndThrowId(String(id), "listingId");

  const listings = await listingsCollection();
  const listing = await listings.findOne({ _id: new ObjectId(cleanId) });

  if (!listing) throw new Error("listing not found");
  return listing;
};

// ---- getAllActiveListings ----

/*
  returns active listings sorted by priority score by default.
  supports optional category and sort filters from the browse page.
  inputs the distributor's id to be used to calculate their distance.
  distributors call this when browsing available food.
*/
export const getAllActiveListings = async (filters = {}, id = null) => {
  /* Input Validation */
  if (typeof filters !== "object" || filters === null) {
    throw new Error("filters must be an object");
  }

  const listings = await listingsCollection();
  const query = {
    status: "active",
    expirationTime: { $gt: new Date().toISOString() },
  };

  if (filters.category) {
    if (typeof filters.category !== "string") {
      throw new Error("category filter must be a string");
    }
    const cleanCat = filters.category.trim().toLowerCase();
    if (!validCategories.includes(cleanCat)) {
      throw new Error(`category must be one of: ${validCategories.join(", ")}`);
    }
    query.foodCategory = cleanCat;
  }
  // building the sort based on what the user selected
  let sortField = { priorityScore: -1 };
  // will sort by distance at the end, default sorts by priority if the distances are the same
  if (filters.sort === "distance") sortField = { priorityScore: -1 };
  if (filters.sort === "expiration") sortField = { expirationTime: 1 };
  if (filters.sort === "newest") sortField = { postedAt: -1 };
  if (filters.sort === "quantity") {
    // sort by quantity of the sum of all the items inside the listing
    sortField = { totalQuantity: -1 };
  }

  const allListings = await listings
    .aggregate([
      { $match: query },
      {
        $lookup: {
          from: "addresses",
          localField: "addressId",
          foreignField: "_id",
          as: "addressDetails",
        },
      },

      {
        $unwind: { path: "$addressDetails", preserveNullAndEmptyArrays: true },
      },

      {
        $lookup: {
          from: "users",
          localField: "donorId",
          foreignField: "_id",
          as: "donorDetails",
        },
      },
      { $unwind: { path: "$donorDetails", preserveNullAndEmptyArrays: true } },
      { 
        // add fields to sort by quantity
        $addFields: {
          totalQuantity: {
            $sum: "$items.quantity"
          }
        }
      },
        { $sort: sortField },
    ])
    .toArray();

  const result = allListings.map((listing) => {
    // Figure out the best name to display for the donor
    let donorName = "Unknown";
    if (listing.donorDetails) {
      donorName =
        listing.donorDetails.organizationName ||
        `${listing.donorDetails.firstName} ${listing.donorDetails.lastName}`;
    }

    const latitude = listing.addressDetails?.location?.latitude || null;
    const longitude = listing.addressDetails?.location?.longitude || null;

    // Safely extract the street address for the UI text
    const pickupAddress = listing.addressDetails
      ? {
          street: listing.addressDetails.street,
          city: listing.addressDetails.city,
          state: listing.addressDetails.state,
          zipCode: listing.addressDetails.zipCode,
        }
      : null;

    // Return the clean object with all the joined data attached
    return {
      _id: listing._id.toString(),
      donorId: listing.donorId.toString(),
      addressId: listing.addressId.toString(),
      title: listing.title,
      description: listing.description,
      items: listing.items,
      foodCategory: listing.foodCategory,
      notes: listing.notes,
      status: listing.status,
      postedAt: listing.postedAt,
      pickupStartTime: listing.pickupStartTime,
      pickupEndTime: listing.pickupEndTime,
      expirationTime: listing.expirationTime,
      priorityScore: listing.priorityScore,
      donorName,
      latitude,
      longitude,
      pickupAddress,
    };
  });


  /*
    Sorts by distance for each listing object using calculateDistance().
    Applies a distanceFactor to the results of the list that measures the distance to the user.
    Sorts the returned list by that distanceFactor.
  */
  // get the latitute and longitude of each object in the array
  // compare them all with the latitute and longitude of the user's marked location
  // sort them based on the difference of each
  console.log(filters.sort);
  if (filters.sort === "distance") {
    const userId = h.checkAndThrowId(id, "userId");
    const thisUser = await getUserById(userId);
    if (thisUser.role !== "distributor") throw new Error("current user is not a distributor.");
    const thisAddress = await getAddressById(thisUser.addressId.toString());

    for (const entry of result) {
      let entryAddress = await getAddressById(entry.addressId);
      const distanceFactor = h.calculateDistance(
        thisAddress.location.latitude,
        thisAddress.location.longitude,
        entryAddress.location.latitude,
        entryAddress.location.longitude
      );
      entry.distanceFactor = distanceFactor;
    } 
    result.sort((a, b) => a.distanceFactor - b.distanceFactor);
  }

  return result;
};

// ---- getListingsByDonor ----

/*
  returns all listings for a specific donor regardless of status,
  newest first. used by the donor dashboard and history page.
*/
export const getListingsByDonor = async (donorId) => {
  /* Input Validation */
  const cleanId = h.checkAndThrowId(String(donorId), "donorId");

  const listings = await listingsCollection();
  const donorListings = await listings
    .find({ donorId: new ObjectId(cleanId)})
    .sort({ postedAt: -1 })
    .toArray();

  return donorListings;
};

// ---- updateListing ----

/*
  only the donor who owns the listing can update it and only
  while it is still active. claimed or delivered listings are
  locked to preserve the transaction record integrity.
*/
export const updateListing = async (listingId, donorId, updateData) => {
  /* Input Validation */
  const cleanListingId = h.checkAndThrowId(String(listingId), "listingId");
  const cleanDonorId = h.checkAndThrowId(String(donorId), "donorId");

  if (!updateData || typeof updateData !== "object") {
    throw new Error("update data is required");
  }

  const listings = await listingsCollection();
  const listing = await listings.findOne({ _id: new ObjectId(cleanListingId) });

  if (!listing) throw new Error("listing not found");

  // verifying ownership before allowing any modifications
  if (listing.donorId.toString() !== cleanDonorId) {
    throw new Error("you do not have permission to edit this listing");
  }
  if (listing.status !== "active") {
    throw new Error("only active listings can be edited");
  }

  // building the update object with only the fields that were provided
  const updateFields = {};

  if (updateData.title) {
    updateFields.title = h.sanitize(
      h.checkAndThrowString(String(updateData.title), "title", 2, 100),
    );
  }

  // casting to string before sanitizing to handle any input type
  if (updateData.description !== undefined) {
    const rawDesc = String(updateData.description || "").trim();
    updateFields.description = rawDesc ? h.sanitize(rawDesc) : "";
  }

  if (updateData.foodCategory) {
    updateFields.foodCategory = parseAndValidateCategory(
      String(updateData.foodCategory),
    );
  }

  if (updateData.items) {
    updateFields.items = parseAndValidateItems(updateData.items);
  }

  if (updateData.notes !== undefined) {
    const rawNotes = String(updateData.notes || "").trim();
    updateFields.notes = rawNotes ? h.sanitize(rawNotes) : "";
  }

  if (updateData.pickupStartTime) {
    updateFields.pickupStartTime = parseAndValidateDatetime(
      updateData.pickupStartTime,
      "pickupStartTime",
    );
  }

  if (updateData.pickupEndTime) {
    updateFields.pickupEndTime = parseAndValidateDatetime(
      updateData.pickupEndTime,
      "pickupEndTime",
    );
  }

  if (updateData.expirationTime) {
    updateFields.expirationTime = parseAndValidateDatetime(
      updateData.expirationTime,
      "expirationTime",
    );
  }

  // check address fields and update address if different
  if (updateData.street && updateData.city && updateData.state && updateData.zipCode) {
    const newAddressId = await getAddressByCoordinates(updateData.street, updateData.city, updateData.state, updateData.zipCode);
    if (listing.addressId.toString() !== newAddressId) {
      updateFields.addressId = new ObjectId(newAddressId);
    }
  }

  // checking time logic on any updated time fields
  const effectiveStart =
    updateFields.pickupStartTime || listing.pickupStartTime;
  const effectiveEnd = updateFields.pickupEndTime || listing.pickupEndTime;
  const effectiveExpiry = updateFields.expirationTime || listing.expirationTime;

  if (updateFields.pickupStartTime && new Date(effectiveStart) <= new Date()) {
    throw new Error("pickup start time must be in the future");
  }
  if (new Date(effectiveStart) >= new Date(effectiveEnd)) {
    throw new Error("pickup end time must be after pickup start time");
  }
  if (new Date(effectiveExpiry) < new Date(effectiveEnd)) {
    throw new Error("expiration time cannot be before the pickup window ends");
  }

  if (Object.keys(updateFields).length === 0) {
    throw new Error("no valid fields were provided to update");
  }

  const result = await listings.updateOne(
    { _id: new ObjectId(cleanListingId) },
    { $set: updateFields },
  );

  if (result.modifiedCount === 0) throw new Error("failed to update listing");
  return await getListingById(cleanListingId);
};

// ---- deleteListing ----

/*
  only the owning donor can delete a listing and only while it
  is still active. once claimed, the listing is tied to a
  transaction and cannot be deleted.
*/
export const deleteListing = async (listingId, donorId) => {
  /* Input Validation */
  const cleanListingId = h.checkAndThrowId(String(listingId), "listingId");
  const cleanDonorId = h.checkAndThrowId(String(donorId), "donorId");

  const listings = await listingsCollection();
  const listing = await listings.findOne({ _id: new ObjectId(cleanListingId) });

  if (!listing) throw new Error("listing not found");

  if (listing.donorId !== cleanDonorId) {
    throw new Error("you do not have permission to delete this listing");
  }
  if (listing.status !== "active") {
    throw new Error("only active listings can be deleted");
  }

  const result = await listings.deleteOne({
    _id: new ObjectId(cleanListingId),
  });
  if (result.deletedCount === 0) throw new Error("failed to delete listing");

  return { deleted: true, listingId: cleanListingId };
};

// ---- claimListing ----

/*
  called when a distributor clicks claim. using an atomic updateOne
  with status: active in the filter so two distributors cannot claim
  the same listing simultaneously. if modifiedCount is 0 it means
  someone else got there first.
*/
export const claimListing = async (listingId, distributorId) => {
  /* Input Validation */
  const cleanListingId = h.checkAndThrowId(String(listingId), "listingId");
  const cleanDistributorId = h.checkAndThrowId(
    String(distributorId),
    "distributorId",
  );

  const listings = await listingsCollection();

  // reading the listing first to check expiration and get donorId
  const listing = await listings.findOne({ _id: new ObjectId(cleanListingId) });
  if (!listing) throw new Error("listing not found");

  if (listing.status !== "active") {
    throw new Error("this listing is no longer available to claim");
  }

  // checking expiration before the atomic update
  if (new Date(listing.expirationTime) <= new Date()) {
    // marking expired while we have the document
    await listings.updateOne(
      { _id: new ObjectId(cleanListingId) },
      { $set: { status: "expired" } },
    );
    throw new Error("this listing has expired and can no longer be claimed");
  }

  /*
    atomic update: only succeeds if status is still active at the
    moment of the write. prevents double-claiming between the check
    above and the actual database write.
  */
  const updateResult = await listings.updateOne(
    { _id: new ObjectId(cleanListingId), status: "active" },
    {
      $set: {
        status: "claimed",
        claimedById: cleanDistributorId,
        claimedAt: new Date().toISOString(),
      },
    },
  );

  if (updateResult.modifiedCount === 0) {
    throw new Error("this listing is no longer available to claim");
  }

  // creating the transaction record after the listing is locked
  const txCol = await transactionsCollection();
  // generating the pickup PIN for physical verification at the handoff
  const pickupPin = generatePickupPin();

  const newTx = {
    listingId: cleanListingId,
    donorId: listing.donorId,
    distributorId: cleanDistributorId,
    status: "claimed",
    claimedAt: new Date().toISOString(),
    completedAt: null,
    receiptSent: false,
    pickupPin,
  };

  const txResult = await txCol.insertOne(newTx);
  if (!txResult.acknowledged || !txResult.insertedId) {
    throw new Error("failed to create transaction record");
  }

  const transactionId = txResult.insertedId.toString();

  // opening the chat thread. not blocking the claim if this fails.
  try {
    await createThread(transactionId, listing.donorId, cleanDistributorId);
  } catch (e) {
    console.error("chat thread creation failed after claim:", e.message);
  }

  // notifying the donor with the PIN so they can share it at pickup
  try {
    await createNotification(
      listing.donorId,
      "listing_claimed",
      `your listing "${listing.title}" has been claimed. your pickup PIN is ${pickupPin}. share this with the distributor when they arrive.`,
    );
  } catch (e) {
    console.error("donor claim notification failed:", e.message);
  }

  // notifying the distributor with the PIN so they know to expect it
  try {
    await createNotification(
      cleanDistributorId,
      "pickup_scheduled",
      `you claimed "${listing.title}". When you arrive at pickup, ask the donor for their 4-digit PIN to confirm the handoff. You will enter it before marking delivered.`,
    );
  } catch (e) {
    console.error("distributor pickup notification failed:", e.message);
  }

  return { listingId: cleanListingId, transactionId, status: "claimed" };
};

// ---- markListingDelivered ----

/*
  called when a distributor confirms the pickup is complete.
  only the distributor who claimed the listing can mark it delivered.
  after updating the listing it updates the transaction, generates a
  receipt document for the donor, and sends a notification.
  side effects use try/catch so a receipt failure never blocks delivery.
*/
export const markListingDelivered = async (listingId, distributorId) => {
  /* Input Validation */
  const cleanListingId = h.checkAndThrowId(String(listingId), "listingId");
  const cleanDistributorId = h.checkAndThrowId(
    String(distributorId),
    "distributorId",
  );

  const listings = await listingsCollection();
  const listing = await listings.findOne({ _id: new ObjectId(cleanListingId) });

  if (!listing) throw new Error("listing not found");
  if (listing.status !== "claimed") {
    throw new Error("only claimed listings can be marked as delivered");
  }
  if (listing.claimedById !== cleanDistributorId) {
    throw new Error("you do not have permission to complete this listing");
  }

  const deliveredAt = new Date().toISOString();

  // updating the listing status to delivered
  const result = await listings.updateOne(
    { _id: new ObjectId(cleanListingId) },
    { $set: { status: "delivered", deliveredAt } },
  );

  if (result.modifiedCount === 0)
    throw new Error("failed to mark listing as delivered");

  // updating the transaction record to delivered status
  let transactionId = null;
  try {
    const txCol = await transactionsCollection();
    const tx = await txCol.findOne({
      listingId: cleanListingId,
      distributorId: cleanDistributorId,
      status: "claimed",
    });

    if (tx) {
      await txCol.updateOne(
        { _id: tx._id },
        { $set: { status: "delivered", completedAt: deliveredAt } },
      );
      transactionId = tx._id.toString();
    }
  } catch (e) {
    console.error("transaction update failed after delivery:", e.message);
  }

  // generating the receipt document for the donor
  if (transactionId) {
    try {
      const userCol = await usersCollection();
      const donor = await userCol.findOne({
        _id: new ObjectId(listing.donorId),
      });
      const distributor = await userCol.findOne({
        _id: new ObjectId(cleanDistributorId),
      });

      if (donor && distributor) {
        // passing the listing with deliveredAt already set for the receipt timestamp
        const listingWithDate = { ...listing, deliveredAt };
        await createReceipt(
          cleanListingId,
          transactionId,
          listingWithDate,
          donor,
          distributor,
        );
      }
    } catch (e) {
      // not blocking the delivery if receipt generation fails
      console.error("receipt generation failed after delivery:", e.message);
    }
  }

  // notifying the donor their receipt is ready to view
  try {
    await createNotification(
      listing.donorId,
      "receipt_generated",
      `your donation receipt for "${listing.title}" is ready to view in your donation history`,
    );
  } catch (e) {
    console.error("receipt notification failed:", e.message);
  }

  return { delivered: true, listingId: cleanListingId, transactionId };
};
