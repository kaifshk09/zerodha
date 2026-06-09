const { Schema } = require("mongoose");

const positionschema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
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

module.exports = { positionschema }; 