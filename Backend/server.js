// Load environment variables first
require('@dotenvx/dotenvx').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Models
const { holdingmodel } = require("./models/holdingmodels");
const { ordersmodel } = require("./models/ordermodel");
const { positionmodel } = require("./models/positionmodel");
const { watchlistmodel } = require("./models/watchlistmodel");
const { fundsmodel } = require("./models/fundsmodel");

// Middleware & Services
const { authRequired } = require("./middleware/auth");
const { getGlobalQuote } = require("./services/alphaVantage");

const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(50);

const app = express();

// 1. Connect to Database
connectDB();

// 2. Rate Limiting (Production safeguard)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);

// 2. Security & Optimization Middleware
app.use(helmet()); // Sets security HTTP headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(compression()); // Compress all responses
app.use(express.json({ limit: '10kb' })); // Body parser with payload limit
app.use(morgan('dev')); // Logger

// 3. Helpers & Internal Logic
const getUserId = (req) => req.user?.sub;
const normalizeSymbol = (v) => String(v || "").trim().toUpperCase();

async function buildPortfolioSummary(userId) {
  const [holdings, positions, watchlist, orders] = await Promise.all([
    holdingmodel.find({ userId }),
    positionmodel.find({ userId }),
    watchlistmodel.find({ userId }),
    ordersmodel.find({ userId }).sort({ createdAt: -1 }).limit(20),
  ]);

  const totalInvestment = holdings.reduce((sum, item) => sum + item.avg * item.qty, 0);
  const currentValue = holdings.reduce((sum, item) => sum + item.price * item.qty, 0);
  
  return {
    holdingsCount: holdings.length,
    positionsCount: positions.length,
    watchlistCount: watchlist.length,
    ordersCount: orders.length,
    totalInvestment,
    currentValue,
    pnl: currentValue - totalInvestment,
    pnlPercent: totalInvestment ? ((currentValue - totalInvestment) / totalInvestment) * 100 : 0,
    holdings,
    positions,
    watchlist,
    recentOrders: orders,
  };
}

const broadcastUpdate = (userId) => {
  setImmediate(async () => {
    try {
      const payload = await buildPortfolioSummary(userId);
      sseEmitter.emit("portfolio.update", { userId, payload });
    } catch (error) {
      console.error(`[SSE] Broadcast failed: ${error.message}`);
    }
  });
};

// 4. API Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'up', environment: process.env.NODE_ENV });
});

// SSE Events
app.get("/api/events", authRequired, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).end();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const listener = ({ userId: evId, payload }) => {
    if (evId === userId) res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sseEmitter.on("portfolio.update", listener);
  
  // Initial burst
  const initial = await buildPortfolioSummary(userId);
  res.write(`data: ${JSON.stringify(initial)}\n\n`);

  req.on("close", () => sseEmitter.removeListener("portfolio.update", listener));
});

// Data Fetching
app.get("/api/portfolio", authRequired, async (req, res, next) => {
  try {
    const summary = await buildPortfolioSummary(getUserId(req));
    res.json(summary);
  } catch (err) { next(err); }
});

app.get("/api/holdings", authRequired, async (req, res, next) => {
  try {
    const holdings = await holdingmodel.find({ userId: getUserId(req) });
    res.json(holdings);
  } catch (err) { next(err); }
});

app.get("/api/funds", authRequired, async (req, res, next) => {
  try {
    const txs = await fundsmodel.find({ userId: getUserId(req) }).sort({ createdAt: -1 });
    const balance = txs.reduce((s, i) => i.type === "WITHDRAW" ? s - i.amount : s + i.amount, 0);
    res.json({ balance, transactions: txs });
  } catch (err) { next(err); }
});

app.get("/api/quote/:symbol", authRequired, async (req, res, next) => {
  try {
    const quote = await getGlobalQuote(normalizeSymbol(req.params.symbol));
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json(quote);
  } catch (err) { next(err); }
});

// 5. Static Assets (Production SPA Serving) - Robustly find and serve frontend build
const buildDirCandidates = [
  path.join(__dirname, "..", "dashboard", "build"),
  path.join(__dirname, "..", "frontent", "build"),
];

let resolvedBuildDir = null;
for (const candidate of buildDirCandidates) {
  if (fs.existsSync(path.join(candidate, "index.html"))) {
    resolvedBuildDir = candidate;
    break;
  }
}

if (resolvedBuildDir) {
  app.use(express.static(resolvedBuildDir));

  // SPA fallback: every non-API GET route returns index.html
  // IMPORTANT: use a RegExp, not "*", to avoid path-to-regexp errors on newer Express versions.
  app.get(/.*/, (req, res) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/health")) return res.status(404).end();
    res.sendFile(path.join(resolvedBuildDir, "index.html"));
  });
} else {
  console.warn("⚠️ [Server] Warning: Frontend build folder not found. Tried:", buildDirCandidates, ". Running in API-only mode.");
}

// 6. Professional Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// 5. Startup
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// 6. Handle Unhandled Rejections (Graceful Shutdown)
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});