const PORT = require("./port");
const LOGICAL = require("./logical");
const DATA = require("./data");

const SegmentTypes = {
    PORT: 0 << 5, // Communication Port to Leave Node (Shall be 1 for a Backplane), Link Address of Next Device
    LOGICAL: 1 << 5,
    NETWORK: 2 << 5,
    SYMBOLIC: 3 << 5,
    DATA: 4 << 5,
    DATATYPE_1: 5 << 5,
    DATATYPE_2: 6 << 6
};

module.exports = { SegmentTypes, PORT, LOGICAL, DATA };
