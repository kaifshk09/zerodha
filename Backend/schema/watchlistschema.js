const { Schema } = require("mongoose");

const watchlistschema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      default: "",
    },
    lastPrice: {
      type: Number,
      default: 0,
    },
    targetPrice: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = { watchlistschema };