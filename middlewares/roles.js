// middlewares/roles.js

const customerOnly = (req, res, next) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ error: "Access denied. Customer only." });
  }
  next();
};

const buddyOnly = (req, res, next) => {
  if (req.user.role !== "buddy") {
    return res.status(403).json({ error: "Access denied. Buddy only." });
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
};

module.exports = { customerOnly, buddyOnly, adminOnly };
