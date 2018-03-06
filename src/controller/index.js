const { ENIP, CIP } = require("../enip");
const dateFormat = require("dateformat");

class Controller extends ENIP {
    constructor() {
        super();

        this.state = {
            ...this.state,
            controller: {
                name: null,
                serial_number: null,
                slot: null,
                time: null,
                path: null,
                version: null,
                status: null,
                faulted: false,
                minorRecoverableFault: false,
                minorUnrecoverableFault: false,
                majorRecoverableFault: false,
                majorUnrecoverableFault: false,
                io_faulted: false
            }
        };
    }

    // region Property Accessors
    get properties() {
        return this.state.controller;
    }

    get time() {
        return dateFormat(this.state.controller.time, "mmmm dd, yyyy - hh:MM:ss TT");
    }
    // endregion

    // region Public Method Definitions
    /**
     * Initializes Session with Desired IP Address
     * and Returns a Promise with the Established Session ID
     *
     * @override
     * @param {string} IP_ADDR - IPv4 Address
     * @param {number} SLOT - Controller Slot Number (0 if CompactLogix)
     * @returns {Promise}
     * @memberof ENIP
     */
    async connect(IP_ADDR, SLOT = 0) {
        const { PORT } = CIP.EPATH.segments;
        const BACKPLANE = 1;

        this.state.controller.slot = SLOT;
        this.state.controller.path = PORT.build(BACKPLANE, SLOT);

        const sessid = await super.connect(IP_ADDR);

        if (!sessid) throw new Error("Failed to Register Session with Controller");

        await this.readControllerProps();

        await this.readWallClock();
    }

    /**
     * Reads Controller Identity Object
     *
     * @memberof Controller
     */
    async readControllerProps() {
        const { GET_ATTRIBUTE_ALL } = CIP.MessageRouter.services;
        const { LOGICAL } = CIP.EPATH.segments;

        // Build Identity Object Logical Path Buffer
        const identityPath = Buffer.concat([
            LOGICAL.build(LOGICAL.types.ClassID, 0x01), // Identity Object (0x01)
            LOGICAL.build(LOGICAL.types.InstanceID, 0x01) // Instance ID (0x01)
        ]);

        // Message Router to Embed in UCMM
        const MR = CIP.MessageRouter.build(GET_ATTRIBUTE_ALL, identityPath, []);

        // Build UCMM Buffer
        const UCMM = CIP.UnconnectedSend.build(MR, this.state.controller.path);

        this.write_cip(UCMM);

        // Wait for Response
        const cpfData = await new Promise((resolve, _) => {
            this.on("SendRRData Received", srrd => {
                resolve(srrd);
            });
        });

        // Get Returned Buffer
        const data = CIP.MessageRouter.parse(cpfData[1].data).data;

        // Parse Returned Buffer
        this.state.controller.serial_number = data.readUInt32LE(10);

        const nameBuf = Buffer.alloc(data.length - 15);
        data.copy(nameBuf, 0, 15);

        this.state.controller.name = nameBuf.toString("utf8");

        const major = data.readUInt8(6);
        const minor = data.readUInt8(7);
        this.state.controller.version = `${major}.${minor}`;

        let status = data.readUInt16LE(8);
        this.state.controller.status = status;

        status &= 0x0ff0;
        this.state.controller.faulted = (status & 0x0f00) === 0 ? false : true;
        this.state.controller.minorRecoverableFault = (status & 0x0100) === 0 ? false : true;
        this.state.controller.minorUnrecoverableFault = (status & 0x0200) === 0 ? false : true;
        this.state.controller.majorRecoverableFault = (status & 0x0400) === 0 ? false : true;
        this.state.controller.majorUnrecoverableFault = (status & 0x0800) === 0 ? false : true;

        status &= 0x0f00;
        this.state.controller.io_faulted = status >> 4 === 2 ? true : false;
        this.state.controller.faulted = status >> 4 === 2 ? true : this.state.controller.faulted;
    }

    async readWallClock() {
        const { GET_ATTRIBUTE_SINGLE } = CIP.MessageRouter.services;
        const { LOGICAL } = CIP.EPATH.segments;

        // Build Identity Object Logical Path Buffer
        const identityPath = Buffer.concat([
            LOGICAL.build(LOGICAL.types.ClassID, 0x8b), // WallClock Object (0x8B)
            LOGICAL.build(LOGICAL.types.InstanceID, 0x01), // Instance ID (0x01)
            LOGICAL.build(LOGICAL.types.AttributeID, 0x05) // Local Time Attribute ID
        ]);

        // Message Router to Embed in UCMM
        const MR = CIP.MessageRouter.build(GET_ATTRIBUTE_SINGLE, identityPath, []);

        // Build UCMM Buffer
        const UCMM = CIP.UnconnectedSend.build(MR, this.state.controller.path);

        this.write_cip(UCMM);

        // Wait for Response
        const cpfData = await new Promise((resolve, _) => {
            this.on("SendRRData Received", srrd => {
                resolve(srrd);
            });
        });

        // Get Returned Buffer
        const data = CIP.MessageRouter.parse(cpfData[1].data).data;

        // Parse Returned Buffer
        let wallClockArray = [];
        for (let i = 0; i < 7; i++) {
            wallClockArray.push(data.readUInt32LE(i * 4));
        }

        // Massage Data to JS Date Friendly Format
        wallClockArray[6] = Math.trunc(wallClockArray[6] / 1000); // convert to ms from us
        wallClockArray[1] -= 1; // month is 0-based

        const date = new Date(...wallClockArray);
        this.state.controller.time = date;
    }

    async writeWallClock(date = new Date()) {
        const { SET_ATTRIBUTE_SINGLE } = CIP.MessageRouter.services;
        const { LOGICAL } = CIP.EPATH.segments;
        const arr = [];

        arr.push(date.getFullYear());
        arr.push(date.getMonth() + 1);
        arr.push(date.getDate());
        arr.push(date.getHours());
        arr.push(date.getMinutes());
        arr.push(date.getSeconds());
        arr.push(date.getMilliseconds() * 1000);

        let buf = Buffer.alloc(28);
        for (let i = 0; i < 7; i++) {
            buf.writeUInt32LE(arr[i], 4 * i);
        }
        //buf.writeUInt8(0x05);

        // Build Identity Object Logical Path Buffer
        const identityPath = Buffer.concat([
            LOGICAL.build(LOGICAL.types.ClassID, 0x8b), // WallClock Object (0x8B)
            LOGICAL.build(LOGICAL.types.InstanceID, 0x01), // Instance ID (0x01)
            LOGICAL.build(LOGICAL.types.AttributeID, 0x05) // Local Time Attribute ID
        ]);

        // Message Router to Embed in UCMM
        const MR = CIP.MessageRouter.build(SET_ATTRIBUTE_SINGLE, identityPath, buf);

        // Build UCMM Buffer
        const UCMM = CIP.UnconnectedSend.build(MR, this.state.controller.path);

        this.write_cip(UCMM);

        // Wait for Response
        const cpfData = await new Promise((resolve, _) => {
            this.on("SendRRData Received", srrd => {
                resolve(srrd);
            });
        });

        this.state.controller.time = date;
    }
    // endregion

    // region Private Method Definitions
    // endregion

    // region Event Handlers
    /**
     * @typedef EncapsulationData
     * @type {Object}
     * @property {number} commandCode - Ecapsulation Command Code
     * @property {string} command - Encapsulation Command String Interpretation
     * @property {number} length - Length of Encapsulated Data
     * @property {number} session - Session ID
     * @property {number} statusCode - Status Code
     * @property {string} status - Status Code String Interpretation
     * @property {number} options - Options (Typically 0x00)
     * @property {Buffer} data - Encapsulated Data Buffer
     */
    /*****************************************************************/

    _handleSendRRDataReceived(data) {}

    _handleSendUnitDataReceived(data) {}

    _handleUnhandledEncapCommandReceived(data) {}

    _handleSessionRegistrationFailed() {}
    // endregion
}

module.exports = Controller;
