const express = require("express");
const router = express.Router();
const User = require("../Models/user");
const passport = require("passport");

router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

router.post("/signup", async (req, res, next) => {
  try {
    let { username, email, password } = req.body;
    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);
    console.log(registeredUser);

    // Automatically log in the user after successful signup
    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", `Welcome, ${username}! Your account has been created and you are now logged in.`);
      return res.redirect("/listings");
    });
  } catch (err) {
    req.flash("error", err.message || "Signup failed. Please try again.");
    res.redirect("/signup");
  }
});

router.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: "Invalid username or password",
  }),
  (req, res) => {
    req.flash("success", `Welcome back, ${req.user.username}!`);
    res.redirect("/listings");
  }
);

// Logout Route
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out.");
    res.redirect("/login");
  });
});

module.exports = router;
