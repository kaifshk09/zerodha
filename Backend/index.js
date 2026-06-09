require("dotenv").config();
const express = require("express");
const { EventEmitter } = require("events");
const { holdingmodel } = require("./models/holdingmodels");
const { ordersmodel } = require("./models/ordermodel");
const { positionmodel } = require("./models/positionmodel");
const { watchlistmodel } = require("./models/watchlistmodel");
const { fundsmodel } = require("./models/fundsmodel");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { usermodel } = require("./models/usermodel");
const { authRequired } = require("./middleware/auth");


// Mitigate some local resolver issues (won't help auth problems)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;

const app = express();
const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(50);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function validateMongoUrl(url) {
  if (!url || typeof url !== "string") return false;
  // Basic sanity check; Atlas connection strings always include mongodb scheme.
  return url.trim().toLowerCase().startsWith("mongodb");
}

async function connectToMongo() {
  if (!validateMongoUrl(uri)) {
    console.error("❌ MONGO_URL is missing or invalid. Set it in Backend/.env");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    // Don't crash the server; log details for diagnosis.
    console.error(
      "❌ MongoDB connection failed:",
      err?.name || err,
      err?.message,
    );
    if (err?.code === 8000) {
      console.error(
        "   AtlasError code 8000 typically means bad username/password, wrong DB/user, or wrong connection string authSource.",
      );
    }
  }
}

function getUserId(req) {
  return req.user?.sub;
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

async function buildPortfolioSummary(userId) {
  const [holdings, positions, watchlist, orders] = await Promise.all([
    holdingmodel.find({ userId }),
    positionmodel.find({ userId }),
    watchlistmodel.find({ userId }),
    ordersmodel.find({ userId }).sort({ createdAt: -1 }).limit(20),
  ]);

  const totalInvestment = holdings.reduce((sum, item) => sum + item.avg * item.qty, 0);
  const currentValue = holdings.reduce((sum, item) => sum + item.price * item.qty, 0);
  const pnl = currentValue - totalInvestment;
  const pnlPercent = totalInvestment ? Number(((pnl / totalInvestment) * 100).toFixed(2)) : 0;

  return {
    holdingsCount: holdings.length,
    positionsCount: positions.length,
    watchlistCount: watchlist.length,
    ordersCount: orders.length,
    totalInvestment,
    currentValue,
    pnl,
    pnlPercent,
    holdings,
    positions,
    watchlist,
    recentOrders: orders,
  };
}

function broadcastUpdate(userId) {
  setImmediate(async () => {
    try {
      const payload = await buildPortfolioSummary(userId);
      sseEmitter.emit("portfolio.update", { userId, payload });
    } catch (error) {
      console.error("Failed to broadcast portfolio update:", error?.message || error);
    }
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// -------------------- AUTH (JWT) --------------------
app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ error: "JWT_SECRET missing on server (set Backend/.env)" });
    }


    const existing = await usermodel.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await usermodel.create({
      email: String(email).toLowerCase().trim(),
      passwordHash,
    });

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Signup failed:", err?.message || err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET missing on server" });
    }

    const user = await usermodel.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Login failed:", err?.message || err);
    return res.status(500).json({ error: "Login failed" });
  }
});

app.get("/auth/me", authRequired, async (req, res) => {
  return res.json({ user: req.user });
});


// app.get("/addholding", async(req, res)=>{
//   let tempholding=[
//   {
//     name: "BHARTIARTL",
//     qty: 2,
//     avg: 538.05,
//     price: 541.15,
//     net: "+0.58%",
//     day: "+2.99%",
//   },
//   {
//     name: "HDFCBANK",
//     qty: 2,
//     avg: 1383.4,
//     price: 1522.35,
//     net: "+10.04%",
//     day: "+0.11%",
//   },
//   {
//     name: "HINDUNILVR",
//     qty: 1,
//     avg: 2335.85,
//     price: 2417.4,
//     net: "+3.49%",
//     day: "+0.21%",
//   },
//   {
//     name: "INFY",
//     qty: 1,
//     avg: 1350.5,
//     price: 1555.45,
//     net: "+15.18%",
//     day: "-1.60%",
//     isLoss: true,
//   },
//   {
//     name: "ITC",
//     qty: 5,
//     avg: 202.0,
//     price: 207.9,
//     net: "+2.92%",
//     day: "+0.80%",
//   },
//   {
//     name: "KPITTECH",
//     qty: 5,
//     avg: 250.3,
//     price: 266.45,
//     net: "+6.45%",
//     day: "+3.54%",
//   },
//   {
//     name: "M&M",
//     qty: 2,
//     avg: 809.9,
//     price: 779.8,
//     net: "-3.72%",
//     day: "-0.01%",
//     isLoss: true,
//   },
//   {
//     name: "RELIANCE",
//     qty: 1,
//     avg: 2193.7,
//     price: 2112.4,
//     net: "-3.71%",
//     day: "+1.44%",
//   },
//   {
//     name: "SBIN",
//     qty: 4,
//     avg: 324.35,
//     price: 430.2,
//     net: "+32.63%",
//     day: "-0.34%",
//     isLoss: true,
//   },
//   {
//     name: "SGBMAY29",
//     qty: 2,
//     avg: 4727.0,
//     price: 4719.0,
//     net: "-0.17%",
//     day: "+0.15%",
//   },
//   {
//     name: "TATAPOWER",
//     qty: 5,
//     avg: 104.2,
//     price: 124.15,
//     net: "+19.15%",
//     day: "-0.24%",
//     isLoss: true,
//   },
//   {
//     name: "TCS",
//     qty: 1,
//     avg: 3041.7,
//     price: 3194.8,
//     net: "+5.03%",
//     day: "-0.25%",
//     isLoss: true,
//   },
//   {
//     name: "WIPRO",
//     qty: 4,
//     avg: 489.3,
//     price: 577.75,
//     net: "+18.08%",
//     day: "+0.32%",
//   },
// ];

// tempholding.forEach((item)=>{
//   let newholding= new holdingmodel({
//     name:item.name,
//     qty:item.qty,
//     avg:item.avg,
//     price:item.price,
//     net:item.net,
//     day:item.day,
//     isLoss:item.isLoss,

//   });
//   newholding.save();
// });
// res.send("done");
// });

// app.get("/addholding", async(req, res)=>{
//   let tempholding=[
//   {
//     product:"CNC",
//     name: "BHARTIARTL",
//     qty: 2,
//     avg: 538.05,
//     price: 541.15,
//     net: "+0.58%",
//     day: "+2.99%",
//     isLoss:"true",
//   },
//   {
//     product:"CNC",
//     name: "HDFCBANK",
//     qty: 2,
//     avg: 1383.4,
//     price: 1522.35,
//     net: "+10.04%",
//     day: "+0.11%",
//     isLoss:"true",
//   },
// ];

// tempholding.forEach((item)=>{
//   let newholding= new holdingmodel({
//     product:item.product,
//     name:item.name,
//     qty:item.qty,
//     avg:item.avg,
//     price:item.price,
//     net:item.net,
//     day:item.day,
//     isLoss:item.isLoss,

//   });
//   newholding.save();
// });
// res.send("done");
// });

const { getGlobalQuote } = require("./services/alphaVantage");

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

async function refreshMarketPricesForUser(userId) {
  const [watchlist, holdings, positions] = await Promise.all([
    watchlistmodel.find({ userId }),
    holdingmodel.find({ userId }),
    positionmodel.find({ userId }),
  ]);

  // Collect symbols
  const allSymbols = new Map();
  for (const i of watchlist) allSymbols.set(String(i.symbol || i.name || "").trim().toUpperCase(), true);
  for (const i of holdings) allSymbols.set(String(i.name || "").trim().toUpperCase(), true);
  for (const i of positions) allSymbols.set(String(i.name || "").trim().toUpperCase(), true);

  const symbolList = [...allSymbols.keys()].filter(Boolean);

  // Fetch quotes
  const quoteBySymbol = {};
  for (const sym of symbolList) {
    try {
      const quote = await getGlobalQuote(sym);
      if (quote) quoteBySymbol[sym] = quote;
    } catch (e) {
      console.error("AlphaVantage quote failed for", sym, e?.message || e);
    }
  }

  // Update watchlist lastPrice in-memory (DB update not required for UI refresh).
  const nextWatchlist = watchlist.map((item) => {
    const sym = String(item.symbol || item.name || "").trim().toUpperCase();
    const quote = quoteBySymbol[sym];

    // Keep existing value if quote missing; ensure numeric fallback.
    const fallbackLastPrice = isFiniteNumber(item.lastPrice) ? item.lastPrice : 0;
    const lastPrice = isFiniteNumber(quote?.price) ? quote.price : fallbackLastPrice;

    return {
      ...item.toObject(),
      lastPrice,
      changePercent: quote?.changePercent ?? item.changePercent,
    };
  });

  const nextHoldings = holdings.map((item) => {
    const sym = String(item.name || "").trim().toUpperCase();
    const quote = quoteBySymbol[sym];

    const fallbackPrice = isFiniteNumber(item.price) ? item.price : 0;
    const price = isFiniteNumber(quote?.price) ? quote.price : fallbackPrice;

    return {
      ...item.toObject(),
      price,
      // net/day in UI currently expects percent string; keep old if no quote.
      net: quote?.changePercent ?? item.net,
    };
  });

  const nextPositions = positions.map((item) => {
    const sym = String(item.name || "").trim().toUpperCase();
    const quote = quoteBySymbol[sym];

    const fallbackPrice = isFiniteNumber(item.price) ? item.price : 0;
    const price = isFiniteNumber(quote?.price) ? quote.price : fallbackPrice;

    return {
      ...item.toObject(),
      price,
      day: quote?.changePercent ?? item.day,
    };
  });

  return { nextWatchlist, nextHoldings, nextPositions };
}


app.use("/api", authRequired);

app.get("/api/events", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  res.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
  });

  const sendEvent = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const listener = ({ userId: eventUserId, payload }) => {
    if (eventUserId !== userId) return;
    sendEvent(payload);
  };

  sseEmitter.on("portfolio.update", listener);

  const initial = await buildPortfolioSummary(userId);
  sendEvent(initial);

  req.on("close", () => {
    sseEmitter.removeListener("portfolio.update", listener);
  });
});

app.get("/api/portfolio", async (req, res) => {
  try {
    const userId = getUserId(req);
    const summary = await buildPortfolioSummary(userId);
    // attach live prices (watchlist/holdings/positions) for UI
    try {
      const { nextHoldings, nextPositions, nextWatchlist } = await refreshMarketPricesForUser(userId);
      summary.holdings = nextHoldings;
      summary.positions = nextPositions;
      summary.watchlist = nextWatchlist;
      // recompute summary totals from refreshed holdings
      const totalInvestment = nextHoldings.reduce((sum, item) => sum + item.avg * item.qty, 0);
      const currentValue = nextHoldings.reduce((sum, item) => sum + item.price * item.qty, 0);
      const pnl = currentValue - totalInvestment;
      const pnlPercent = totalInvestment ? Number(((pnl / totalInvestment) * 100).toFixed(2)) : 0;
      summary.totalInvestment = totalInvestment;
      summary.currentValue = currentValue;
      summary.pnl = pnl;
      summary.pnlPercent = pnlPercent;
    } catch (e) {
      console.error('Live price refresh failed:', e?.message || e);
    }
    return res.json(summary);
  } catch (err) {
    console.error("Portfolio fetch failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to load portfolio summary" });
  }
});

app.get("/api/funds", async (req, res) => {
  try {
    const userId = getUserId(req);
    const transactions = await fundsmodel.find({ userId }).sort({ createdAt: -1 });
    const balance = transactions.reduce((sum, item) => {
      return item.type === "WITHDRAW" ? sum - item.amount : sum + item.amount;
    }, 0);
    return res.json({ balance, transactions });
  } catch (err) {
    console.error("Funds fetch failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to load funds" });
  }
});

app.post("/api/funds", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, type, note } = req.body || {};
    const parsedAmount = Number(amount);
    if (!isFiniteNumber(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    if (!["DEPOSIT", "WITHDRAW"].includes(type)) {
      return res.status(400).json({ error: "Type must be DEPOSIT or WITHDRAW" });
    }

    const transaction = await fundsmodel.create({
      userId,
      amount: parsedAmount,
      type,
      note: String(note || ""),
    });

    broadcastUpdate(userId);
    return res.status(201).json(transaction);
  } catch (err) {
    console.error("Create fund transaction failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to save fund transaction" });
  }
});

app.get("/api/quote/:symbol", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }
    const quote = await getGlobalQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }
    return res.json(quote);
  } catch (err) {
    console.error("Quote fetch failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch quote" });
  }
});

app.get("/api/holdings", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { nextHoldings } = await refreshMarketPricesForUser(userId);
    return res.json(nextHoldings);
  } catch (err) {
    console.error("Holdings fetch failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to load holdings" });
  }
});

app.post("/api/holdings", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, qty, avg, price, net, day, isLoss } = req.body || {};
    const holding = await holdingmodel.create({
      userId,
      name: normalizeSymbol(name),
      qty: Number(qty) || 0,
      avg: Number(avg) || 0,
      price: Number(price) || 0,
      net: net || "0.00%",
      day: day || "0.00%",
      isLoss: Boolean(isLoss),
    });
    broadcastUpdate(userId);
    res.status(201).json(holding);
  } catch (err) {
    console.error("Create holding failed:", err?.message || err);
    res.status(500).json({ error: "Failed to create holding" });
  }
});

app.put("/api/holdings/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const update = req.body || {};
    const holding = await holdingmodel.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true },
    );
    if (!holding) return res.status(404).json({ error: "Holding not found" });
    broadcastUpdate(userId);
    res.json(holding);
  } catch (err) {
    console.error("Update holding failed:", err?.message || err);
    res.status(500).json({ error: "Failed to update holding" });
  }
});

app.delete("/api/holdings/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await holdingmodel.findOneAndDelete({ _id: req.params.id, userId });
    if (!result) return res.status(404).json({ error: "Holding not found" });
    broadcastUpdate(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete holding failed:", err?.message || err);
    res.status(500).json({ error: "Failed to remove holding" });
  }
});

app.get("/api/positions", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { nextPositions } = await refreshMarketPricesForUser(userId);
    return res.json(nextPositions);
  } catch (err) {
    console.error("Positions fetch failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to load positions" });
  }
});

app.post("/api/positions", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { product, name, qty, avg, price, net, day, isLoss } = req.body || {};
    const position = await positionmodel.create({
      userId,
      product: String(product || "").trim(),
      name: normalizeSymbol(name),
      qty: Number(qty) || 0,
      avg: Number(avg) || 0,
      price: Number(price) || 0,
      net: net || "0.00%",
      day: day || "0.00%",
      isLoss: Boolean(isLoss),
    });
    broadcastUpdate(userId);
    res.status(201).json(position);
  } catch (err) {
    console.error("Create position failed:", err?.message || err);
    res.status(500).json({ error: "Failed to create position" });
  }
});

app.delete("/api/positions/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await positionmodel.findOneAndDelete({ _id: req.params.id, userId });
    if (!result) return res.status(404).json({ error: "Position not found" });
    broadcastUpdate(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete position failed:", err?.message || err);
    res.status(500).json({ error: "Failed to remove position" });
  }
});

app.get("/api/watchlist", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { nextWatchlist } = await refreshMarketPricesForUser(userId);
    return res.json(nextWatchlist);
  } catch (err) {
    console.error("Watchlist fetch failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to load watchlist" });
  }
});

app.post("/api/watchlist", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { symbol, name, lastPrice, targetPrice, note } = req.body || {};
    const item = await watchlistmodel.create({
      userId,
      symbol: normalizeSymbol(symbol),
      name: String(name || symbol || "").trim(),
      lastPrice: Number(lastPrice) || 0,
      targetPrice: Number(targetPrice) || 0,
      note: String(note || ""),
    });
    broadcastUpdate(userId);
    res.status(201).json(item);
  } catch (err) {
    console.error("Create watchlist item failed:", err?.message || err);
    res.status(500).json({ error: "Failed to add watchlist item" });
  }
});

app.delete("/api/watchlist/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await watchlistmodel.findOneAndDelete({ _id: req.params.id, userId });
    if (!result) return res.status(404).json({ error: "Watchlist item not found" });
    broadcastUpdate(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete watchlist item failed:", err?.message || err);
    res.status(500).json({ error: "Failed to remove watchlist item" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const userId = getUserId(req);
    const orders = await ordersmodel.find({ userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Orders fetch failed:", err?.message || err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, qty, price, mode } = req.body || {};
    const order = await ordersmodel.create({
      userId,
      name: normalizeSymbol(name),
      qty: Number(qty) || 0,
      price: Number(price) || 0,
      mode: mode === "SELL" ? "SELL" : "BUY",
      status: "PENDING",
    });
    broadcastUpdate(userId);
    res.status(201).json(order);
  } catch (err) {
    console.error("Create order failed:", err?.message || err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

