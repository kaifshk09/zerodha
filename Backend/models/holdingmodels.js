const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    avg: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    net: {
      type: String,
      default: "0.00%",
    },
    day: {
      type: String,
      default: "0.00%",
    },
    isLoss: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const holdingmodel = mongoose.model("Holding", holdingSchema);

module.exports = { holdingmodel };