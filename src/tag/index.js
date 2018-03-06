const { EventEmitter } = require("events");
const { CIP } = require("../enip");
const { Types, getTypeCodeString, isValidTypeCode } = require("../enip/cip/data-types");
const dateFormat = require("dateFormat");

class Tag extends EventEmitter {
    constructor(tagname, program = null, datatype = Types.DINT) {
        super();

        if (!Tag.isValidTagname(tagname)) throw new Error("Tagname Must be of Type <string>");
        if (!isValidTypeCode(datatype))
            throw new Error("Datatype must be a Valid Type Code <number>");

        // Split Tagname
        let pathArr = tagname.split(".");
        let bufArr = [];

        // Push Program Path to Buffer if Present
        if (program) bufArr.push(CIP.EPATH.segments.DATA.build(`Program:${program}`));

        // Build EPATH Buffer
        for (let path of pathArr) {
            bufArr.push(CIP.EPATH.segments.DATA.build(path));
        }

        const pathBuf = Buffer.concat(bufArr);

        this.state = {
            tag: { name: tagname, type: datatype, value: null, path: pathBuf },
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
            const lastValue = this.state.tag.value;
            this.state.tag.value = newValue;
            this.state.timestamp = new Date();
            if (lastValue !== null) this.emit("Changed", this, lastValue);
            else this.emit("Initialized", this);
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

    get path() {
        return this.state.tag.path;
    }
    // endregion

    /**
     * Determines if a Tagname is Valid
     *
     * @static
     * @param {string} tagname
     * @returns {boolean}
     * @memberof Tag
     */
    static isValidTagname(tagname) {
        if (typeof tagname !== "string") return false;

        const tag = tagname.split(".");

        const test = tag[tag.length - 1];
        const regex = /^[a-zA-Z][a-zA-Z0-9_]*([a-zA-Z0-9_]|\[\d+\])$/i; // regex string to check for valid tagnames
        return typeof tagname === "string" && regex.test(test) && test.length <= 40;
    }
    // endregion
}

module.exports = Tag;
