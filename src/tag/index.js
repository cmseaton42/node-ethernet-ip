const { EventEmitter } = require("events");
const { Types, getTypeCodeString, isValidTypeCode } = require("../enip/cip/data-types");
const dateFormat = require("dateFormat");

class Tag extends EventEmitter {
    constructor(tagname, datatype = Types.UDINT) {
        super();

        if (!Tag.isValidTagname(tagname)) throw new Error("Tagname Must be of Type <string>");
        if (!isValidTypeCode(datatype)) throw new Error("Datatype must be a Valid Type Code <number>");

        this.state = {
            tag: { name: tagname, type: datatype, value: null },
            error: { code: null, status: null },
            timestamp: new Date()
        };
    }

    // region Property Accessors

    /**
     * Gets Tagname
     *
     * @memberof Tag
     * @returns {string} tagname
     */
    get name() {
        return this.state.tag.name;
    }

    /**
     * Sets Tagname if Valid
     *
     * @memberof Tag
     * @property {string} New Tag Name
     */
    set name(name) {
        if (!Tag.isValidTagname(name)) throw new Error("Tagname Must be of Type <string>");
        this.state.tag.name = name;
    }

    /**
     * Gets Tag Datatype
     *
     * @memberof Tag
     * @returns {string} datatype
     */
    get type() {
        return getTypeCodeString(this.state.tag.type);
    }

    /**
     * Sets Tag Datatype if Valid
     *
     * @memberof Tag
     * @property {number} Valid Datatype Code
     */
    set type(type) {
        if (!isValidTypeCode(type)) throw new Error("Datatype must be a Valid Type Code <number>");
        this.state.tag.type = type;
    }

    /**
     * Gets Tag value
     * - Returns null if no value has been read
     *
     * @readonly
     * @memberof Tag
     * @returns {number|string|boolean|object} value
     */
    get value() {
        return this.state.tag.value;
    }

    /**
     * Sets Tag Value
     *
     * @memberof Tag
     * @property {number|string|boolean|object} new value
     */
    set value(newValue) {
        if (newValue !== this.state.tag.value) {
            const oldValue = this.state.tag.value;
            this.state.tag.value = newValue;
            this.state.timestamp = new Date();
            this.emit("change", oldValue, newValue);
        }
    }

    /**
     * Gets Timestamp in a Human Readable Format
     *
     * @readonly
     * @memberof Tag
     * @returns {string}
     */
    get timestamp() {
        return dateFormat(this.state.timestamp, "mm/dd/yyyy-HH:MM:ss.l");
    }

    /**
     * Gets Javascript Date Object of Timestamp
     *
     * @readonly
     * @memberof Tag
     * @returns {Date}
     */
    get timestamp_raw() {
        return this.state.timestamp;
    }

    /**
     * Gets Error
     *
     * @readonly
     * @memberof Tag
     * @returns {object|null} error
     */
    get error() {
        return this.state.error.code ? this.state.error : null;
    }
    // endregion

    // region Static Class Methods
    static isValidTagname(tagname) {
        const regex = /^[a-zA-Z][a-zA-Z0-9_]*([a-zA-Z0-9_]|\[\d+\])$/i; // regex string to check for valid tagnames
        return typeof tagname === "string" && regex.test(tagname) && tagname.length <= 40;
    }
    // endregion
}

module.exports = Tag;
