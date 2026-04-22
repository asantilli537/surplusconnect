/*
This file contains all routes relevant for authentication including sign up, sign in, and sign out.
Depending on user role, the sign up forms will contain different fields. Sign up page will be the same for both.
*/

import { Router } from "express";
const router = Router();
import * as helpers from "../helpers.js";

router.route("/").get(async (req, res) => {
  // Code for root route
});

router
  .route("/signup")
  .get(async (req, res) => {
    // Code for signup GET
  })
  .post(async (req, res) => {
    // Code for signup POST
  });
