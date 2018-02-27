const { EventEmitter } = require("events");
const { Types } = require("../enip/cip/data-types");
const dateFormat = require("dateFormat");

class Tag extends EventEmitter {
    constructor() {
        super(tagname, datatype = Types.UDINT);

        this.state = {
            tag: { name: tagname, type: datatype },
            error: { code: null, status: null },
            timestamp: new Date()
        };
    }

    // region Property Accessors
    get name() {
        return this.state.tag.name;
    }

    set name(name) {
        if (Tag.isValidTagname(name)) this.state.tag.name = name;
    }

    get DataType() {
        return this.state.tag.type;
    }

    set DataType(type) {
        this.state.tag.type = type;
    }
    // endregion

    // region Public Method Definitions

    // endregion

    // region Private Method Definitions
    // endregion

    // region Event Handlers

    // endregion

    // region Static Class Methods
    static isValidTagname(tagname) {
        const regex = /^[a-zA-Z][a-zA-Z0-9_]*([a-zA-Z0-9_]|\[\d+\])$/i; // regex string to check for valid tagnames
        return regex.test(tagname) && tagname.length <= 40;
    }
    // endregion
}

module.exports = Tag;
