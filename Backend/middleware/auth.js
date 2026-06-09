const jwt = require("jsonwebtoken");

function getTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth) {
    const parts = auth.split(" ");
    if (parts.length === 2) {
      const [scheme, token] = parts;
      if (/^Bearer$/i.test(scheme)) return token;
    }
  }

  if (req.query && req.query.token) {
    return String(req.query.token).trim();
  }

  return null;
}

function authRequired(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "Missing token" });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res
        .status(500)
        .json({ error: "JWT_SECRET missing on server" });
    }

    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authRequired };

