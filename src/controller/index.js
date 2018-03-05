const { ENIP, CIP } = require("../enip");

class Controller extends ENIP {
    constructor() {
        super();

        this.state = {
            ...this.state,
            controller: {
                name: null,
                slot: null,
                time: null
            }
        }
    }

    // region Property Accessors

    // endregion

    // region Public Method Definitions

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
    
    _handleSessionRegistered(sessid) {}

    _handleSessionUnregistered() {}

    _handleSendRRDataReceived(data) {}

    _handleSendUnitDataReceived(data) {}

    _handleUnhandledEncapCommandReceived(data) {}

    _handleSessionRegistrationFailed() {}
    // endregion
}

module.exports.default = Controller;
