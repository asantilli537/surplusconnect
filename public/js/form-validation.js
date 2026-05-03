/*
  form-validation.js handles client-side validation for all signup
  forms and the listing create form. it intercepts the submit event,
  checks every required field, shows inline error messages, and only
  allows the form to proceed if everything passes.

  the course requires client-side validation on every form. this file
  is loaded only on pages that need it via the pageScripts array.
*/

// ---- helpers ----

const showError = (fieldId, message) => {
  const errEl = document.getElementById(`${fieldId}-error`);
  const input = document.getElementById(fieldId);
  if (errEl) errEl.textContent = message;
  if (input) input.classList.add('is-invalid');
};

const clearError = (fieldId) => {
  const errEl = document.getElementById(`${fieldId}-error`);
  const input = document.getElementById(fieldId);
  if (errEl) errEl.textContent = '';
  if (input) input.classList.remove('is-invalid');
};

const clearAllErrors = (form) => {
  form.querySelectorAll('.form-error').forEach((el) => {
    el.textContent = '';
  });
  form.querySelectorAll('.is-invalid').forEach((el) => {
    el.classList.remove('is-invalid');
  });
};

const isValidEmail = (val) => {
  // basic email format check, server will do the full check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
};

const isValidPhone = (val) => {
  // accepting formats like 201-555-0100 or 2015550100
  return /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(val.trim());
};

const isValidZip = (val) => {
  return /^\d{5}$/.test(val.trim());
};

const isValidState = (val) => {
  return /^[A-Za-z]{2}$/.test(val.trim());
};

const isStrongPassword = (val) => {
  // must be at least 12 chars with upper, lower, number, special char
  if (val.length < 12) return false;
  if (!/[A-Z]/.test(val)) return false;
  if (!/[a-z]/.test(val)) return false;
  if (!/[0-9]/.test(val)) return false;
  if (!/[^A-Za-z0-9]/.test(val)) return false;
  return true;
};

// ---- login form validation ----

const loginForm = document.querySelector('form[action="/login"]');

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    let valid = true;
    clearAllErrors(loginForm);

    const email    = document.getElementById('email');
    const password = document.getElementById('password');

    if (!email || !email.value.trim()) {
      showError('email', 'email address is required');
      valid = false;
    } else if (!isValidEmail(email.value)) {
      showError('email', 'please enter a valid email address');
      valid = false;
    }

    if (!password || !password.value.trim()) {
      showError('password', 'password is required');
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      // focusing the first field with an error
      loginForm.querySelector('.is-invalid')?.focus();
    }
  });
}

// ---- shared address and account validation ----

/*
  these run on any signup form since all three role forms
  have the same address and password fields.
*/

const validateAddressFields = () => {
  let valid = true;

  const street  = document.getElementById('street');
  const city    = document.getElementById('city');
  const state   = document.getElementById('state');
  const zipCode = document.getElementById('zipCode');

  if (street && !street.value.trim()) {
    showError('street', 'street address is required');
    valid = false;
  }

  if (city && !city.value.trim()) {
    showError('city', 'city is required');
    valid = false;
  }

  if (state) {
    if (!state.value.trim()) {
      showError('state', 'state is required');
      valid = false;
    } else if (!isValidState(state.value)) {
      showError('state', 'enter a valid 2 letter state code');
      valid = false;
    }
  }

  if (zipCode) {
    if (!zipCode.value.trim()) {
      showError('zipCode', 'zip code is required');
      valid = false;
    } else if (!isValidZip(zipCode.value)) {
      showError('zipCode', 'zip code must be exactly 5 digits');
      valid = false;
    }
  }

  return valid;
};

const validatePasswordFields = () => {
  let valid = true;

  const password        = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');

  if (!password || !password.value.trim()) {
    showError('password', 'password is required');
    valid = false;
  } else if (!isStrongPassword(password.value)) {
    showError(
      'password',
      'password must be at least 12 characters and include uppercase, lowercase, a number, and a special character'
    );
    valid = false;
  }

  if (confirmPassword) {
    if (!confirmPassword.value.trim()) {
      showError('confirmPassword', 'please confirm your password');
      valid = false;
    } else if (password && confirmPassword.value !== password.value) {
      showError('confirmPassword', 'passwords do not match');
      valid = false;
    }
  }

  return valid;
};

const validateBaseFields = () => {
  let valid = true;

  const firstName = document.getElementById('firstName');
  const lastName  = document.getElementById('lastName');
  const email     = document.getElementById('email');
  const phone     = document.getElementById('phoneNumber');

  if (!firstName || !firstName.value.trim()) {
    showError('firstName', 'first name is required');
    valid = false;
  } else if (firstName.value.trim().length < 2) {
    showError('firstName', 'first name must be at least 2 characters');
    valid = false;
  }

  if (!lastName || !lastName.value.trim()) {
    showError('lastName', 'last name is required');
    valid = false;
  } else if (lastName.value.trim().length < 2) {
    showError('lastName', 'last name must be at least 2 characters');
    valid = false;
  }

  if (!email || !email.value.trim()) {
    showError('email', 'email address is required');
    valid = false;
  } else if (!isValidEmail(email.value)) {
    showError('email', 'please enter a valid email address');
    valid = false;
  }

  if (phone) {
    if (!phone.value.trim()) {
      showError('phoneNumber', 'phone number is required');
      valid = false;
    } else if (!isValidPhone(phone.value)) {
      showError('phoneNumber', 'enter a valid 10 digit phone number');
      valid = false;
    }
  }

  return valid;
};

// ---- donor signup validation ----

const donorForm = document.querySelector('form[action="/signup/donor"]');

if (donorForm) {
  donorForm.addEventListener('submit', (e) => {
    clearAllErrors(donorForm);
    let valid = true;

    // validating all field groups
    if (!validateBaseFields())    valid = false;
    if (!validateAddressFields()) valid = false;
    if (!validatePasswordFields()) valid = false;

    const orgName = document.getElementById('organizationName');
    if (!orgName || !orgName.value.trim()) {
      showError('organizationName', 'business name is required');
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      donorForm.querySelector('.is-invalid')?.focus();
    }
  });
}

// ---- distributor signup validation ----

const distributorForm = document.querySelector('form[action="/signup/distributor"]');

if (distributorForm) {
  distributorForm.addEventListener('submit', (e) => {
    clearAllErrors(distributorForm);
    let valid = true;

    if (!validateBaseFields())    valid = false;
    if (!validateAddressFields()) valid = false;
    if (!validatePasswordFields()) valid = false;

    const orgName = document.getElementById('organizationName');
    if (!orgName || !orgName.value.trim()) {
      showError('organizationName', 'organization name is required');
      valid = false;
    }

    const ein = document.getElementById('einNumber');
    if (!ein || !ein.value.trim()) {
      showError('einNumber', 'EIN number is required for verification');
      valid = false;
    } else if (!/^\d{2}-\d{7}$/.test(ein.value.trim())) {
      showError('einNumber', 'EIN must be in the format 12-3456789');
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      distributorForm.querySelector('.is-invalid')?.focus();
    }
  });
}

// ---- volunteer signup validation ----

const volunteerForm = document.querySelector('form[action="/signup/volunteer"]');

if (volunteerForm) {
  volunteerForm.addEventListener('submit', (e) => {
    clearAllErrors(volunteerForm);
    let valid = true;

    if (!validateBaseFields())     valid = false;
    if (!validateAddressFields())  valid = false;
    if (!validatePasswordFields()) valid = false;

    if (!valid) {
      e.preventDefault();
      volunteerForm.querySelector('.is-invalid')?.focus();
    }
  });
}

// ---- listing create form validation ----

const listingForm = document.getElementById('listing-form');

if (listingForm) {
  listingForm.addEventListener('submit', (e) => {
    clearAllErrors(listingForm);
    let valid = true;

    const title = document.getElementById('title');
    if (!title || !title.value.trim()) {
      showError('title', 'listing title is required');
      valid = false;
    } else if (title.value.trim().length > 100) {
      showError('title', 'title cannot exceed 100 characters');
      valid = false;
    }

    const category = document.getElementById('foodCategory');
    if (!category || !category.value) {
      showError('foodCategory', 'please select a food category');
      valid = false;
    }

    const pickupStart = document.getElementById('pickupStartTime');
    const pickupEnd   = document.getElementById('pickupEndTime');
    const expiration  = document.getElementById('expirationTime');
    const now         = new Date();

    if (!pickupStart || !pickupStart.value) {
      showError('pickupStartTime', 'pickup start time is required');
      valid = false;
    } else if (new Date(pickupStart.value) <= now) {
      showError('pickupStartTime', 'pickup start time must be in the future');
      valid = false;
    }

    if (!pickupEnd || !pickupEnd.value) {
      showError('pickupEndTime', 'pickup end time is required');
      valid = false;
    } else if (pickupStart && pickupEnd.value <= pickupStart.value) {
      showError('pickupEndTime', 'pickup end time must be after start time');
      valid = false;
    }

    if (!expiration || !expiration.value) {
      showError('expirationTime', 'expiration time is required');
      valid = false;
    } else if (pickupEnd && expiration.value < pickupEnd.value) {
      showError('expirationTime', 'expiration time should not be before the pickup window ends');
      valid = false;
    }

    // checking that at least one item row has a name filled in
    const firstItemName = document.getElementById('items[0][name]');
    if (!firstItemName || !firstItemName.value.trim()) {
      valid = false;
      // showing the error near the add item button
      const container = document.getElementById('items-container');
      console.log(container);
      if (container) {
        let errSpan = container.querySelector('.items-error');
        if (!errSpan) {
          errSpan = document.createElement('span');
          errSpan.className  = 'form-error items-error';
          errSpan.textContent = 'at least one food item is required';
          container.after(errSpan);
        }
      }
    }

    if (!valid) {
      e.preventDefault();
      listingForm.querySelector('.is-invalid')?.focus();
    }
  });

  // clearing field errors as user corrects them
  listingForm.querySelectorAll('.form-input, .form-select, .form-textarea').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const errEl = document.getElementById(`${input.id}-error`);
      if (errEl) errEl.textContent = '';
    });
  });
}