// middleware/authenticate.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ error: 'Please login' });

  try {
    const decoded = jwt.verify(token, 'secret-key'); // Use env var in production
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;
