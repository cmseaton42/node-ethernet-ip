const { EventEmitter } = require("events");
const crypto = require("crypto");
const { CIP } = require("../enip");
const { MessageRouter } = CIP;
const { READ_TAG, WRITE_TAG } = MessageRouter.services;
const { Types, getTypeCodeString, isValidTypeCode } = require("../enip/cip/data-types");
const dateFormat = require("dateformat");

// Static Class Property - Tracks Instances
let instances = 0;
class Tag extends EventEmitter {
    constructor(tagname, program = null, datatype = null) {
        super();

        if (!Tag.isValidTagname(tagname)) throw new Error("Tagname Must be of Type <string>");
        if (!isValidTypeCode(datatype) && datatype !== null)
            throw new Error("Datatype must be a Valid Type Code <number>");

        // Increment Instances
        instances += 1;

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
            tag: {
                name: tagname,
                type: datatype,
                value: null,
                controllerValue: null,
                path: pathBuf
            },
            read_size: 0x01,
            error: { code: null, status: null },
            timestamp: new Date(),
            instance: hash(pathBuf)
        };
    }

    // region Property Accessors
    /**
     * Returns the total number of Tag Instances
     * that have been Created
     *
     * @readonly
     * @static
     * @returns {number} instances
     * @memberof Tag
     */
    static get instances() {
        return instances;
    }

    /**
     * Returns the Tag Instance ID
     *
     * @readonly
     * @returns {string} Instance ID
     * @memberof Tag
     */
    get instance_id() {
        return this.state.instance;
    }

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
     * Gets Tag Read Size
     *
     * @memberof Tag
     * @returns {number} read size
     */
    get read_size() {
        return this.state.read_size;
    }

    /**
     * Sets Tag Read Size
     *
     * @memberof Tag
     * @property {number} read size
     */
    set read_size(size) {
        if (typeof type !== "number")
            throw new Error("Read Size must be a Valid Type Code <number>");
        this.state.read_size = size;
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
        this.state.tag.value = newValue;
    }

    /**
     * Sets Controller Tag Value and Emits Changed Event
     *
     * @memberof Tag
     * @property {number|string|boolean|object} new value
     */
    set controller_value(newValue) {
        if (newValue !== this.state.tag.controllerValue) {
            const lastValue = this.state.tag.controllerValue;
            this.state.tag.controllerValue = newValue;
            this.state.tag.value = newValue;
            this.state.timestamp = new Date();

            if (lastValue !== null) this.emit("Changed", this, lastValue);
            else this.emit("Initialized", this);
        }
    }

    /**
     * Sets Controller Tag Value and Emits Changed Event
     *
     * @memberof Tag
     * @returns {number|string|boolean|object} new value
     */
    get controller_value() {
        return this.state.tag.controllerValue;
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

    /**
     * Returns a Padded EPATH of Tag
     *
     * @readonly
     * @returns {buffer} Padded EPATH
     * @memberof Tag
     */
    get path() {
        return this.state.tag.path;
    }
    // endregion

    // region Public Methods
    /**
     * Generates Read Tag Message
     *
     * @param {number} [size=null]
     * @returns {buffer} - Read Tag Message Service
     * @memberof Tag
     */
    generateReadMessageRequest(size = null) {
        if (size) this.state.read_size = size;

        const { tag } = this.state;

        // Build Message Router to Embed in UCMM
        let buf = Buffer.alloc(2);
        buf.writeUInt16LE(this.state.read_size, 0);

        // Build Current Message
        return MessageRouter.build(READ_TAG, tag.path, buf);
    }

    /**
     *  Parses Good Read Request Messages
     *
     * @param {buffer} Data Returned from Successful Read Tag Request
     * @memberof Tag
     */
    parseReadMessageResponse(data) {
        const { SINT, INT, DINT, REAL, BOOL } = Types;

        // Set Type of Tag Read
        const type = data.readUInt16LE(0);
        this.state.tag.type = type;

        // Read Tag Value
        /* eslint-disable indent */
        switch (type) {
            case SINT:
                this.controller_value = data.readInt8(2);
                break;
            case INT:
                this.controller_value = data.readInt16LE(2);
                break;
            case DINT:
                this.controller_value = data.readInt32LE(2);
                break;
            case REAL:
                this.controller_value = data.readFloatLE(2);
                break;
            case BOOL:
                this.controller_value = data.readUInt8(2) === 0x01 ? true : false;
                break;
            default:
                throw new Error("Unrecognized Type Passed Read from Controller");
        }
        /* eslint-enable indent */
    }

    /**
     * Generates Write Tag Message
     *
     * @param {number|boolean|object|string} [newValue=null] - If Omitted, Tag.value will be used
     * @param {number} [size=0x01]
     * @returns {buffer} - Write Tag Message Service
     * @memberof Tag
     */
    generateWriteMessageRequest(value = null, size = 0x01) {
        if (value !== null) this.state.tag.value = value;

        const { tag } = this.state;
        const { SINT, INT, DINT, REAL, BOOL } = Types;

        if (tag.type === null)
            throw new Error(
                `Tag ${
                    tag.name
                } has not been initialized. Try reading the tag from the controller first or manually providing a valid CIP datatype.`
            );

        // Build Message Router to Embed in UCMM
        let buf = Buffer.alloc(4);
        let valBuf = null;
        buf.writeUInt16LE(tag.type, 0);
        buf.writeUInt16LE(size, 2);

        /* eslint-disable indent */
        switch (tag.type) {
            case SINT:
                valBuf = Buffer.alloc(1);
                valBuf.writeInt8(tag.value);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case INT:
                valBuf = Buffer.alloc(2);
                valBuf.writeInt16LE(tag.value);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case DINT:
                valBuf = Buffer.alloc(4);
                valBuf.writeInt32LE(tag.value);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case REAL:
                valBuf = Buffer.alloc(4);
                valBuf.writeFloatLE(tag.value);

                buf = Buffer.concat([buf, valBuf]);
                break;
            case BOOL:
                valBuf = Buffer.alloc(1);
                if (!tag.value) valBuf.writeInt8(0x00);
                else valBuf.writeInt8(0x01);

                buf = Buffer.concat([buf, valBuf]);
                break;
            default:
                throw new Error("Unrecognized Type to Write to Controller");
        }

        // Build Current Message
        return MessageRouter.build(WRITE_TAG, tag.path, buf);
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

/**
 * Generates Unique ID for Each Instance
 * based on the Generated EPATH
 *
 * @param {buffer} input - EPATH of Tag
 * @returns {string} hash
 */
const hash = input => {
    return crypto
        .createHash("md5")
        .update(input)
        .digest("hex");
};

module.exports = Tag;
