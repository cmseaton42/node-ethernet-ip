const { SegmentTypes } = require("../index");

const types = {
    ClassID: 0 << 5,
    InstanceID: 1 << 5,
    MemberID: 2 << 5,
    ConnPoint: 3 << 5,
    AttributeID: 4 << 5,
    Special: 5 << 5,
    ServiceID: 6 << 5
};

const format = {
    Byte: 0,
    Word: 1,
    DWord: 2
};

/**
 * Determines the Validity of the Type Code
 * 
 * @param {number} type - Logical Segment Type Code
 * @returns {boolean}
 */
const validateLogicalType = type => {
    for (let type of Object.keys(types)) {
        if (types[type] === type) return true;
    }
    return false;
};

const build = (type, value, padded = true) => {
    if (!validateLogicalType(type))
        throw new Error("Invalid Logical Type Code Passed to Segment Builder");

    if (typeof value !== "number" || value <= 0)
        throw new Error("Passed Value Must be a Positive Integer");

    // Determine Size of Logical Segment Value
    let format = null;
    if (value <= 255) {
        format = 0;
    } else if (value > 255 && value <= 65535) {
        format = 1;
    } else {
        format = 2;
    }

    // Build Segment Byte
    const segmentByte = SegmentTypes.LOGICAL | type | format;
};
