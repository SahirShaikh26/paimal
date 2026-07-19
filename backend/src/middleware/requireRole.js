// Per-route role gate for the tenant hierarchy (Director > Manager > Engineer).
// Usage: router.post('/x', requireRole('Director','Manager'), handler)
module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
