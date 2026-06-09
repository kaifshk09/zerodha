const { model } = require("mongoose");
const { orderschema } = require("../schema/ordersschema");

const ordersmodel = model("Order", orderschema);

module.exports = { ordersmodel };