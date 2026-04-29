// checking if someone is logged in at all before letting them through
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// checking if the logged-in user has the right role for this route
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.redirect('/login');
    }
    next();
  };
};

// flipping the logic - logged-in users shouldn't see login or signup pages
const requireGuest = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  next();
};

export { requireLogin, requireRole, requireGuest };