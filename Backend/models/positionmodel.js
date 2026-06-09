const mongoose = require("mongoose");
const { positionschema } = require("../schema/positionschema");

const positionmodel = mongoose.model("Position", positionschema);

module.exports = { positionmodel };
