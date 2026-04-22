/*
This file contains helper functions that will be used throughout the project.
These functions can be used for date/time formatting, input validation, or other repetitive tasks.
*/

// Function to check validity of a string input
export const checkStringValidity = (string, minLength = 1, maxLength = 100) => {
  // Check if string has a value
  if (string === undefined) return false;

  // Check if string is of "string" data type
  if (typeof string !== "string") return false;

  // Check if string is empty by trimming and checking length
  string = string.trim();
  if (string.length === 0) return false;

  // Check if string length is within allowed length
  if (string.length < minLength || string.length > maxLength) return false;

  return true;
};

// Function to get the current date in MM/DD/YYYY format
export const getCurrentDate = () => {
  const today = new Date();

  let month = today.getMonth() + 1;
  let day = today.getDate();
  const year = today.getFullYear();

  // Add leading "0" to day and month field
  if (day < 10) {
    day = "0" + day;
  }
  if (month < 10) {
    month = "0" + month;
  }

  const formattedDate = `${month}/${day}/${year}`;
  return formattedDate;
};

// Function to get the current date & time in MM/DD/YYYY HH:MMAM/PM format
export const getCurrentDateTime = () => {
  const today = new Date();

  let month = today.getMonth() + 1;
  let day = today.getDate();
  const year = today.getFullYear();

  let hours = today.getHours();
  let minutes = today.getMinutes();

  // Add leading "0" to day and month field
  if (day < 10) {
    day = "0" + day;
  }
  if (month < 10) {
    month = "0" + month;
  }

  let meridiem = "";
  if (hours > 12) {
    meridiem = "PM";
  } else {
    meridiem = "AM";
  }

  // If using a 12 hours clock
  hours = hours % 12;
  if (hours === 0) hours = 12;

  // Adding leading "0" to hours and minutes
  if (hours < 10) {
    hours = "0" + String(hours);
  }
  if (minutes < 10) {
    minutes = "0" + String(minutes);
  }

  let formattedDateTime = `${month}/${day}/${year} ${hours}:${minutes}${meridiem}`;
  return formattedDateTime;
};

// Function to check password validty
export const checkPasswordValidity = (password) => {
  if (!password) return false;
  if (typeof password !== "string" || password.trim().length === 0)
    return false;
  password = password.trim();
  const minLength = 12;
  if (password.length < minLength) return false;
  // check upper, lower, number, special
  return true;
};
