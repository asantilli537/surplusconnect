import { ObjectId } from "mongodb";
import validator from 'validator';

export const checkIfValidString = (string) => {
    /*
        Validates and trims string, makes sure it's not all spaces.
    */
    if (typeof string !== 'string' || string === null || string.trim().length === 0) {
        throw `${string} is either empty or not a valid string.`
    }
    return string.trim();
};

export const checkIfValidId = (id) => {
    /*
        Takes in an objectId string,
        and returns the trimmed string if valid.
    */
    id = id.trim();
    checkIfValidString(id);
    if (!ObjectId.isValid(id)) throw `${id} is not a valid object ID.`;
    return id;
};

export const checkIfValidEmail = (email) => {
    /* Takes in the email as a string,
       and returns the email if it's a
       valid email address.
       Also validates the string and trims it.
    */
    email = checkIfValidString(email);
    // god i love not reinventing the wheel!
    if (validator.isEmail(email)) {
        return email;
    } else {
        throw `${email} is not a valid email address.`;
    }
};

export const getCurrentDate = () => {
    /* Get the current date and return it as a string. */
    let currentDate = new Date();
    currentDate = formatDate(currentDate);
    return currentDate;
};

export const checkStringLength = (string, a, b) => { // BOOLEAN
    /*
        Returns true if it's valid, throws if not.
        A and B are the minimum and maximum valid lengths of
        the string that you're checking.
    */
    if (string.length < a || string.length > b) {
        throw `${string} is not a valid length (between ${a} and ${b}).`;
    }
    return true;
};
