const { Socket, isIPv4 } = require("net");
const { EIP_PORT } = require("../config");
const encapsulation = require("./encapsulation");


class ENIP extends Socket {
    constructor() {
        super();

        state = {
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
    
    // region Public Instance Methods
    connect(IP_ADDR) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }

        if (isIPv4(IP_ADDR)) {
            throw new Error("Invalid IP_ADDR <string> passed to Controller <class>");
        }

        const { registerSession } = encapsulation;

        this.state.session.establishing = true;

        return new Promise(resolve => {
            super.connect(EIP_PORT, IP_ADDR, () => {
                this.state.session.establishing = false;

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
}
