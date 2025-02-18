function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  req.flash("error", "You must be logged in to perform this action.");
  res.redirect("/login");
}
