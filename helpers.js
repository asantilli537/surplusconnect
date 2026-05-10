/*
  helper functions used across the project for validation,
  formatting, and common operations. keeping everything here
  means we fix it once and it works everywhere.
*/

import { ObjectId } from "mongodb";
import xss from "xss";

// ---- string validation ----

export const checkStringValidity = (str, minLength = 1, maxLength = 100) => {
  if (str === undefined || str === null) return false;
  if (typeof str !== "string") return false;
  str = str.trim();
  if (str.length === 0) return false;
  if (str.length < minLength || str.length > maxLength) return false;
  return true;
};

/*
  throws if the string is invalid, returns the trimmed version if valid.
  used throughout data functions to clean and validate in one call.
*/
export const checkAndThrowString = (
  str,
  fieldName,
  minLength = 1,
  maxLength = 100,
) => {
  if (!checkStringValidity(str, minLength, maxLength)) {
    throw new Error(
      `${fieldName} must be a non-empty string between ${minLength} and ${maxLength} characters`,
    );
  }
  return str.trim();
};

// ---- id validation ----

export const checkIdValidity = (id) => {
  if (!id || typeof id !== "string") return false;
  id = id.trim();
  if (id.length === 0) return false;
  return ObjectId.isValid(id);
};

export const checkAndThrowId = (id, fieldName = "id") => {
  if (!checkIdValidity(id)) {
    throw new Error(`${fieldName} must be a valid ObjectId string`);
  }
  return id.trim();
};

// ---- email validation ----

export const checkEmailValidity = (email) => {
  if (!checkStringValidity(email, 5, 254)) return false;
  // standard email format check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const checkAndThrowEmail = (email) => {
  if (!checkEmailValidity(email)) {
    throw new Error("a valid email address is required");
  }
  return email.trim().toLowerCase();
};

// ---- password validation ----

/*
  checking all four complexity requirements the course requires:
  at least 12 characters, one uppercase, one lowercase,
  one number, and one special character.
*/
export const checkPasswordValidity = (password) => {
  if (!password || typeof password !== "string") return false;
  if (password.trim().length < 12) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
};

export const checkAndThrowPassword = (password) => {
  if (!checkPasswordValidity(password)) {
    throw new Error(
      "password must be at least 12 characters and include uppercase, lowercase, a number, and a special character",
    );
  }
  return password;
};

// ---- phone validation ----

export const checkPhoneValidity = (phone) => {
  if (!checkStringValidity(phone, 7, 20)) return false;
  // accepting formats like 201-555-0100 or 2015550100
  return /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(phone.trim());
};

export const checkAndThrowPhone = (phone) => {
  if (!checkPhoneValidity(phone)) {
    throw new Error("a valid 10 digit phone number is required");
  }
  return phone.trim();
};

// ---- zip code validation ----

export const checkZipValidity = (zip) => {
  if (!checkStringValidity(zip, 5, 5)) return false;
  return /^\d{5}$/.test(zip.trim());
};

export const checkAndThrowZip = (zip) => {
  if (!checkZipValidity(zip)) {
    throw new Error("zip code must be exactly 5 digits");
  }
  return zip.trim();
};

// ---- state validation ----

export const checkStateValidity = (state) => {
  if (!checkStringValidity(state, 2, 2)) return false;
  return /^[A-Za-z]{2}$/.test(state.trim());
};

export const checkAndThrowState = (state) => {
  if (!checkStateValidity(state)) {
    throw new Error("state must be a valid 2 letter code");
  }
  return state.trim().toUpperCase();
};

// ---- role validation ----

const validRoles = ["donor", "distributor", "volunteer", "admin"];

export const checkRoleValidity = (role) => {
  if (!checkStringValidity(role)) return false;
  return validRoles.includes(role.trim().toLowerCase());
};

/*
  For the listing sorting, calculates the distance between two location objects.
  This returns a distance number used internally, does not return a specific unit.
*/

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  let numsList = [lat1, lon1, lat2, lon2];
  for (const i of numsList) {
    if (typeof i !== "number" || isNaN(i) || i < -90 || i > 90) {
      throw new Error("longitudes and latitudes must be valid numbers between -90 and 90");
    }
  }

  // grabs the distance, assuming flatness due to (relatively) small distances/
  const lat_distance = lat1 - lat2;
  const lon_distance = lon1 - lon2;
  const distanceFactor = Math.sqrt((lat_distance * lat_distance) + (lon_distance * lon_distance));
  return distanceFactor;
};

export const checkAndThrowRole = (role) => {
  if (!checkRoleValidity(role)) {
    throw new Error(`role must be one of: ${validRoles.join(", ")}`);
  }
  return role.trim().toLowerCase();
};

// ---- EIN validation for distributors ----

export const checkEinValidity = (ein) => {
  if (!checkStringValidity(ein, 10, 10)) return false;
  // format must be XX-XXXXXXX
  return /^\d{2}-\d{7}$/.test(ein.trim());
};

export const checkAndThrowEin = (ein) => {
  if (!checkEinValidity(ein)) {
    throw new Error("EIN must be in the format 12-3456789");
  }
  return ein.trim();
};

// ---- XSS sanitization ----

/*
  running user-supplied text through the xss package before
  storing it. call this on any string that came from a form field
  before it goes into the database.
*/
export const sanitize = (str) => {
  if (typeof str !== "string") return str;
  return xss(str.trim());
};

// ---- date formatting ----

export const getCurrentDate = () => {
  const today = new Date();
  let month = today.getMonth() + 1;
  let day = today.getDate();
  const year = today.getFullYear();

  if (day < 10) day = "0" + day;
  if (month < 10) month = "0" + month;

  return `${month}/${day}/${year}`;
};

export const getCurrentDateTime = () => {
  const today = new Date();
  let month = today.getMonth() + 1;
  let day = today.getDate();
  const year = today.getFullYear();
  let hours = today.getHours();
  let minutes = today.getMinutes();
  const meridiem = hours >= 12 ? "PM" : "AM";

  if (day < 10) day = "0" + day;
  if (month < 10) month = "0" + month;

  hours = hours % 12;
  if (hours === 0) hours = 12;
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;

  return `${month}/${day}/${year} ${hours}:${minutes}${meridiem}`;
};

export const geocodeAddress = async (street, city, state, zipCode) => {
  if (!street || !city || !state || !zipCode) {
    throw new Error("all address fields are required for geocoding");
  }

  const baseUrl = "https://nominatim.openstreetmap.org/search";
  const query = new URLSearchParams({
    street: street.trim(),
    city: city.trim(),
    state: state.trim(),
    postalcode: zipCode.trim(),
    country: "USA",
    format: "json",
    limit: 1,
  });
  const fetchUrl = `${baseUrl}?${query.toString()}`;
  try {
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        // NOMINATIM REQUIREMENT: Must identify your app to avoid being blocked
        "User-Agent":
          "SurplusConnect_CS546_Group_Project (pkulkarn1@stevens.edu)",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(
        "Invalid address: Could not locate coordinates for the provided address.",
      );
    }
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (e) {
    throw new Error(`Geocoding failed: ${e.message}`);
  }
};
