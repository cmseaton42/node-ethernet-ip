const { Socket, isIPv4 } = require("net");
const { EIP_PORT } = require("../config");
const colors = require("colors");
const encapsulation = require("./encapsulation");

class ENIP extends Socket {
    constructor() {
        super();

        this.state = {
            TCP: { establishing: false, established: false },
            session: { id: null, establishing: false, established: false },
            error: { code: null, msg: null }
        };

        // Initialize Event Handlers for Underlying Socket Class
        this.initializeEventHandlers();
    }

    // region Property Accessors
    /**
     * Returns an Object
     *  - <number> error code
     *  - <string> human readable error
     *
     * @readonly
     * @memberof ENIP
     */
    get error() {
        return this.state.error;
    }

    /**
     * Session Establishment In Progress
     *
     * @readonly
     * @memberof ENIP
     */
    get establishing() {
        return this.state.session.establishing;
    }
    /**
     * Session Established Successfully
     *
     * @readonly
     * @memberof ENIP
     */
    get established() {
        return this.state.session.established;
    }

    /**
     * Get ENIP Session ID
     *
     * @readonly
     * @memberof ENIP
     */
    get session_id() {
        return this.state.session.id;
    }
    // endregion

    /**
     * Initializes Session with Desired IP Address
     *
     * @param {string} IP_ADDR - IPv4 Address
     * @returns {Promise}
     * @memberof ENIP
     */
    connect(IP_ADDR) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }

        if (isIPv4(IP_ADDR)) {
            throw new Error("Invalid IP_ADDR <string> passed to Controller <class>");
        }

        const { registerSession } = encapsulation;

        this.state.session.establishing = true;
        this.state.TCP.establishing = true;

        return new Promise(resolve => {
            super.connect(EIP_PORT, IP_ADDR, () => {
                this.state.session.establishing = false;
                this.state.TCP.established = true;

                this.write(registerSession());
                resolve();
            });
        });
    }
    // endregion

    // region Private Instance Methods
    initializeEventHandlers() {
        //TODO: add some stuff
    }
    //endregion

    // region Inherited Class Event Handlers

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

    handleDataEvent(data) {
        const { parse } = encapsulation.header;
        const { commands } = encapsulation;

        const encapsulatedData = parse(data);
        const { statusCode, status, commandCode } = encapsulatedData;

        if (statusCode !== 0) {
            console.log(`Error <${statusCode}>:`.red, status.red);

            this.state.error.code = statusCode;
            this.state.error.msg = status;

            this.emit("Session Register Failed", this.state.error);
        } else {
            /* eslint-disable indent */
            switch (commandCode) {
                case commands.RegisterSession:
                    this.state.session.establishing = false;
                    this.state.session.established = true;
                    this.state.session.id = encapsulatedData.session;
                    this.emit("Session Registered", this.state.session.id);
                case commands.UnregisterSession:
                    this.state.session.established = false;
                    this.emit("Session Unregistered");
                case commands.SendRRData:
                    // TODO: Convert UCMM Encoded Data Object to be Emitted instead of Raw Data
                    this.emit(
                        "SendRRData Received",
                        encapsulatedData.length,
                        encapsulatedData.data
                    );
                case commands.SendUnitData:
                    this.emit(
                        "SendUnitData Received",
                        encapsulatedData.length,
                        encapsulatedData.data
                    );
                default:
                    this.emit("Unhandled Encapsulated Command Received", encapsulatedData);
            }
            /* eslint-enable indent */
        }
    }
    // endregion
}

module.exports = { ENIP };
