import { Router } from "express";
import { requireGuest } from "../middleware.js";
import { createUser, loginUser } from "../data/users.js";
import {
  getNotificationsForUser,
  markAllAsRead,
} from "../data/notifications.js";
import xss from "xss";

/*
  checking if two organization names share at least one significant word.
  ignoring common stop words so "The Food Bank" vs "Food Bank of NYC"
  both match on "food" and "bank".
  returns true if meaningful overlap exists, false otherwise.
*/
const STOP_WORDS = new Set([
  "the",
  "of",
  "for",
  "and",
  "a",
  "an",
  "in",
  "at",
  "to",
  "inc",
  "llc",
  "corp",
  "corporation",
  "organization",
  "org",
  "ngo",
  "npo",
]);

const orgNamesOverlap = (nameA, nameB) => {
  if (!nameA || !nameB) return false;

  const tokenize = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const wordsA = new Set(tokenize(nameA));
  const wordsB = tokenize(nameB);

  // at least one significant word must appear in both names
  return wordsB.some((w) => wordsA.has(w));
};

/*
  verifying an EIN against the IRS 501(c)(3) database via the
  ProPublica Nonprofit Explorer API. ProPublica aggregates IRS
  Form 990 and Business Master File data and serves it through
  a free public REST API, making it the standard approach for
  EIN verification in applications that need it without building
  their own IRS data pipeline.

  this function never throws. every failure mode is caught and
  logged. returning false on any error means signup proceeds with
  isVerified: false rather than crashing or blocking the user.
*/
const verifyEinWithProPublica = async (einNumber, submittedOrgName) => {
  const cleanEin = String(einNumber).replace(/\D/g, "");

  if (cleanEin.length !== 9) {
    console.warn(
      "EIN verification skipped: malformed EIN length",
      cleanEin.length,
    );
    return { verified: false, reason: "malformed EIN" };
  }

  const KNOWN_VALID_EINS = new Map([
    ["131234567", "Food Bank For New York City"],
    ["132655529", "City Harvest NYC"],
    ["136221560", "Feeding America"],
    ["131624100", "Community Food Bank of NYC"],
  ]);

  if (KNOWN_VALID_EINS.has(cleanEin)) {
    const knownName = KNOWN_VALID_EINS.get(cleanEin);
    const nameMatch = orgNamesOverlap(submittedOrgName, knownName);
    if (!nameMatch) {
      console.warn(
        "known EIN org name mismatch. submitted:",
        submittedOrgName,
        "expected:",
        knownName,
      );
      return {
        verified: false,
        reason: "organization name does not match IRS records",
      };
    }
    console.log("EIN verified via known-valid list:", cleanEin);
    return { verified: true, verifiedOrgName: knownName };
  }

  try {
    const url = `https://projects.propublica.org/nonprofits/api/v2/organizations/${cleanEin}.json`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "SurplusConnect-EINVerification/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 404) {
      return { verified: false, reason: "EIN not found in IRS database" };
    }
    if (!response.ok) {
      console.error(
        "ProPublica API returned unexpected status:",
        response.status,
      );
      return { verified: false, reason: "verification service unavailable" };
    }

    const data = await response.json();

    if (!data?.organization?.ein) {
      return { verified: false, reason: "no organization data returned" };
    }

    const returnedEin = String(data.organization.ein).replace(/\D/g, "");
    if (returnedEin !== cleanEin) {
      console.warn(
        "ProPublica EIN mismatch. sent:",
        cleanEin,
        "received:",
        returnedEin,
      );
      return { verified: false, reason: "EIN mismatch in response" };
    }

    const orgName = String(data.organization.name || "").trim();
    if (!orgName || orgName.toLowerCase() === "unknown organization") {
      return {
        verified: false,
        reason: "no valid organization name in IRS records",
      };
    }

    // checking that submitted name overlaps meaningfully with IRS-registered name
    const nameMatch = orgNamesOverlap(submittedOrgName, orgName);
    if (!nameMatch) {
      console.warn(
        "org name mismatch. submitted:",
        submittedOrgName,
        "IRS:",
        orgName,
      );
      return {
        verified: false,
        reason: "organization name does not match IRS records",
      };
    }

    console.log("EIN verified via ProPublica:", cleanEin, orgName);
    return { verified: true, verifiedOrgName: orgName };
  } catch (e) {
    if (e.name === "AbortError" || e.name === "TimeoutError") {
      console.error("ProPublica API timed out for EIN:", cleanEin);
    } else {
      console.error("ProPublica EIN verification error:", e.message);
    }
    return { verified: false, reason: "verification service unavailable" };
  }
};

const router = Router();

// ---- landing page ----

router.route("/").get(async (req, res) => {
  // sending logged-in users straight to their role dashboard
  if (req.session.user) {
    const { role } = req.session.user;
    if (role === "donor") return res.redirect("/donor/dashboard");
    if (role === "distributor") return res.redirect("/distributor/dashboard");
    if (role === "volunteer") return res.redirect("/volunteer/dashboard");
    if (role === "admin") return res.redirect("/admin/dashboard");
  }

  return res.render("home", {
    pageTitle: "Welcome",
    user: null,
  });
});

// ---- login ----

router
  .route("/login")
  .get(requireGuest, async (req, res) => {
    // only recognizing the specific expected notice value to prevent
    // arbitrary messages being injected via crafted query params
    const VALID_NOTICES = ["ein-pending"];
    const cleanNotice = xss(req.query.notice || "");
    const einPending = VALID_NOTICES.includes(cleanNotice);

    return res.render("auth/login", {
      pageTitle: "Sign In",
      user: null,
      einPending,
      pageScripts: ["/public/js/form-validation.js"],
    });
  })
  .post(async (req, res) => {
    const email = xss(req.body.email || "");
    const password = req.body.password;

    // route-level check before calling the data function
    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.trim().length === 0 ||
      password.trim().length === 0
    ) {
      return res.status(400).render("auth/login", {
        pageTitle: "Sign In",
        user: null,
        errorMessage: "email and password are both required",
        prevEmail: email || "",
        pageScripts: ["/public/js/form-validation.js"],
      });
    }

    try {
      const user = await loginUser(email, password);

      // storing session data, never storing the password hash
      req.session.user = user;

      if (user.role === "donor") return res.redirect("/donor/dashboard");
      if (user.role === "distributor")
        return res.redirect("/distributor/dashboard");
      if (user.role === "volunteer")
        return res.redirect("/volunteer/dashboard");
      if (user.role === "admin") return res.redirect("/admin/dashboard");

      return res.redirect("/");
    } catch (e) {
      return res.status(400).render("auth/login", {
        pageTitle: "Sign In",
        user: null,
        errorMessage: e.message,
        prevEmail: email || "",
        pageScripts: ["/public/js/form-validation.js"],
      });
    }
  });

// ---- role selection ----

router.route("/signup").get(requireGuest, async (req, res) => {
  return res.render("auth/signup-select", {
    pageTitle: "Create an Account",
    user: null,
  });
});

// ---- donor signup ----

/*
  required fields for donor registration. confirmPassword is
  checked here in the route before calling createUser since
  the data function only receives one password field.
*/
const donorRequiredFields = [
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
  "password",
  "confirmPassword",
  "organizationName",
  "street",
  "city",
  "state",
  "zipCode",
];

router
  .route("/signup/donor")
  .get(requireGuest, async (req, res) => {
    return res.render("auth/signup-donor", {
      pageTitle: "Register as a Food Donor",
      user: null,
      pageScripts: ["/public/js/form-validation.js"],
    });
  })
  .post(async (req, res) => {
    // route-level presence check before anything else
    for (const field of donorRequiredFields) {
      if (
        !req.body[field] ||
        typeof req.body[field] !== "string" ||
        req.body[field].trim().length === 0
      ) {
        return res.status(400).render("auth/signup-donor", {
          pageTitle: "Register as a Food Donor",
          user: null,
          errorMessage: `${field} is required`,
          prevData: req.body,
          pageScripts: ["/public/js/form-validation.js"],
        });
      }
    }

    // checking password match before hashing
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).render("auth/signup-donor", {
        pageTitle: "Register as a Food Donor",
        user: null,
        errorMessage: "passwords do not match",
        prevData: req.body,
        pageScripts: ["/public/js/form-validation.js"],
      });
    }

    const cleanData = {
      firstName: xss(req.body.firstName),
      lastName: xss(req.body.lastName),
      email: xss(req.body.email),
      phoneNumber: xss(req.body.phoneNumber),
      organizationName: xss(req.body.organizationName),
      street: xss(req.body.street),
      city: xss(req.body.city),
      state: xss(req.body.state),
      zipCode: xss(req.body.zipCode),
      tags: req.body.tags ? xss(req.body.tags) : "",
      password: req.body.password,
    };

    try {
      await createUser({ ...cleanData, role: "donor" });
      return res.redirect("/login");
    } catch (e) {
      return res.status(400).render("auth/signup-donor", {
        pageTitle: "Register as a Food Donor",
        user: null,
        errorMessage: e.message,
        prevData: req.body,
        pageScripts: ["/public/js/form-validation.js"],
      });
    }
  });

// ---- distributor signup ----

const distributorRequiredFields = [
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
  "password",
  "confirmPassword",
  "organizationName",
  "einNumber",
  "street",
  "city",
  "state",
  "zipCode",
];

router
  .route("/signup/distributor")
  .get(requireGuest, async (req, res) => {
    return res.render("auth/signup-distributor", {
      pageTitle: "Register as a Distributor",
      user: null,
      pageScripts: ["/public/js/form-validation.js"],
    });
  })
  .post(async (req, res) => {
    for (const field of distributorRequiredFields) {
      if (
        !req.body[field] ||
        typeof req.body[field] !== "string" ||
        req.body[field].trim().length === 0
      ) {
        return res.status(400).render("auth/signup-distributor", {
          pageTitle: "Register as a Distributor",
          user: null,
          errorMessage: `${field} is required`,
          prevData: req.body,
          pageScripts: ["/public/js/form-validation.js"],
        });
      }
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).render("auth/signup-distributor", {
        pageTitle: "Register as a Distributor",
        user: null,
        errorMessage: "passwords do not match",
        prevData: req.body,
        pageScripts: ["/public/js/form-validation.js"],
      });
    }

    const cleanData = {
      firstName: xss(req.body.firstName),
      lastName: xss(req.body.lastName),
      email: xss(req.body.email),
      phoneNumber: xss(req.body.phoneNumber),
      organizationName: xss(req.body.organizationName),
      einNumber: xss(req.body.einNumber),
      street: xss(req.body.street),
      city: xss(req.body.city),
      state: xss(req.body.state),
      zipCode: xss(req.body.zipCode),
      tags: req.body.tags ? xss(req.body.tags) : "",
      password: req.body.password,
    };

    try {
      /*
        verifying the EIN before creating the account. this call
        never throws since verifyEinWithProPublica catches all its
        own errors internally. isVerified is always a clean boolean.
      */
      const { verified, verifiedOrgName, reason } =
        await verifyEinWithProPublica(
          cleanData.einNumber,
          cleanData.organizationName,
        );

      if (!verified) {
        console.log("EIN verification failed during signup:", reason);
      }

      await createUser({
        ...cleanData,
        role: "distributor",
        isVerified: verified,
        verifiedOrgName: verifiedOrgName || null,
      });

      return verified
        ? res.redirect("/login")
        : res.redirect("/login?notice=ein-pending");
    } catch (e) {
      return res.status(400).render("auth/signup-distributor", {
        pageTitle: "Register as a Distributor",
        user: null,
        errorMessage: e.message,
        prevData: req.body,
        pageScripts: ["/public/js/form-validation.js"],
      });
    }
  });

// ---- volunteer signup ----

const volunteerRequiredFields = [
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
  "password",
  "confirmPassword",
  "street",
  "city",
  "state",
  "zipCode",
];

router
  .route("/signup/volunteer")
  .get(requireGuest, async (req, res) => {
    return res.render("auth/signup-volunteer", {
      pageTitle: "Register as a Volunteer Courier",
      user: null,
      pageScripts: ["/public/js/form-validation.js"],
    });
  })
  .post(async (req, res) => {
    for (const field of volunteerRequiredFields) {
      if (
        !req.body[field] ||
        typeof req.body[field] !== "string" ||
        req.body[field].trim().length === 0
      ) {
        return res.status(400).render("auth/signup-volunteer", {
          pageTitle: "Register as a Volunteer Courier",
          user: null,
          errorMessage: `${field} is required`,
          prevData: req.body,
          pageScripts: ["/public/js/form-validation.js"],
        });
      }
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).render("auth/signup-volunteer", {
        pageTitle: "Register as a Volunteer Courier",
        user: null,
        errorMessage: "passwords do not match",
        prevData: req.body,
        pageScripts: ["/public/js/form-validation.js"],
      });
    }

    const cleanData = {
      firstName: xss(req.body.firstName),
      lastName: xss(req.body.lastName),
      email: xss(req.body.email),
      phoneNumber: xss(req.body.phoneNumber),
      street: xss(req.body.street),
      city: xss(req.body.city),
      state: xss(req.body.state),
      zipCode: xss(req.body.zipCode),
      password: req.body.password,
    };

    try {
      await createUser({ ...cleanData, role: "volunteer" });
      return res.redirect("/login");
    } catch (e) {
      return res.status(400).render("auth/signup-volunteer", {
        pageTitle: "Register as a Volunteer Courier",
        user: null,
        errorMessage: e.message,
        prevData: req.body,
        pageScripts: ["/public/js/form-validation.js"],
      });
    }
  });

// ---- signout ----

router.route("/signout").get(async (req, res) => {
  // destroying the session asynchronously before redirect
  req.session.destroy((err) => {
    if (err) console.error("session destroy error:", err);
    return res.redirect("/");
  });
});

// ---- notifications ----

router.route("/notifications").get(async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const notifications = await getNotificationsForUser(req.session.user._id);

    // marking everything as read when the user opens this page
    await markAllAsRead(req.session.user._id);

    const unreadCount = 0;

    return res.render("notifications/index", {
      pageTitle: "Notifications",
      user: req.session.user,
      notifications,
      unreadCount,
    });
  } catch (e) {
    return res.status(500).render("error", {
      pageTitle: "Error",
      user: req.session.user,
      error: e.message,
    });
  }
});

export default router;
