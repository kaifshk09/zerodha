const { model } = require("mongoose");
const { watchlistschema } = require("../schema/watchlistschema");

const watchlistmodel = model("Watchlist", watchlistschema);

module.exports = { watchlistmodel };
