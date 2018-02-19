const { Socket, isIPv4 } = require("net");
const { EIP_PORT } = require("../config");
const encapsulation = require("./encapsulation");


class ENIP extends Socket {
    constructor() {
        super();

        state = {
            session: {
                id: null,
                establishing: false,
                established: false
            }
        }

        this.initializeEventHandlers();
    }

    connect(IP_ADDR) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }

        if (net.isIPv4(IP_ADDR)) {
            throw new Error("Invalid IP_ADDR <string> passed to Controller <class>");
        }
        
        const { registerSession } = encapsulation;

        return new Promise((resolve, reject) => {
            super.connect(EIP_PORT, IP_ADDR, () => {
                this.write(registerSession());
            })
        });
    }

    initializeEventHandlers() {
        //TODO: add some stuff
    }
}