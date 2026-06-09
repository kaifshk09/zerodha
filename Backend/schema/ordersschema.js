const { Schema } = require("mongoose");

const orderschema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    mode: {
      type: String,
      enum: ["BUY", "SELL"],
      default: "BUY",
    },
    status: {
      type: String,
      enum: ["PENDING", "FILLED", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = { orderschema }; 