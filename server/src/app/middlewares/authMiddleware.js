const jwt = require("jsonwebtoken");

module.exports = function authenticateToken(req, res, next) {
  const cookieToken = req.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("nexaspace_token="))
    ?.slice("nexaspace_token=".length);
  const token =
    cookieToken || req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token)
    return res.status(401).json({ message: "Authentication required" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
