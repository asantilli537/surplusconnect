/*
This file contains all routes relevant for authentication including sign up, sign in, and sign out.
Depending on user role, the sign up forms will contain different fields. Sign up page will be the same for both.
*/

import { Router } from "express";
const router = Router();
import * as helpers from "../helpers.js";

router.route("/").get(async (req, res) => {
  // Code for root route
    if (req.session.user) {
    const role = req.session.user.role;
    if (role === 'donor') return res.redirect('/donor/dashboard');
    if (role === 'distributor') return res.redirect('/distributor/dashboard');
    if (role === 'volunteer') return res.redirect('/volunteer/dashboard');
    if (role === 'admin') return res.redirect('/admin/dashboard');
  }

  // not logged in, showing the landing page
  return res.render('home', {
    pageTitle: 'Welcome',
    user: req.session.user || null,
  });
});

router
  .route("/signup")
  .get(async (req, res) => {
    // Code for signup GET
  })
  .post(async (req, res) => {
    // Code for signup POST
  });

  export default router;