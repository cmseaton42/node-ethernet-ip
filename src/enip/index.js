const { Socket, isIPv4 } = require("net");
const { EIP_PORT } = require("../config");
const encapsulation = require("./encapsulation");
const CIP = require("./cip");
const { promiseTimeout } = require("../utilities");
const { lookup } = require("dns");

/**
 * Low Level Ethernet/IP
 *
 * @class ENIP
 * @extends {Socket}
 * @fires ENIP#Session Registration Failed
 * @fires ENIP#Session Registered
 * @fires ENIP#Session Unregistered
 * @fires ENIP#SendRRData Received
 * @fires ENIP#SendUnitData Received
 * @fires ENIP#Unhandled Encapsulated Command Received
 */
class ENIP extends Socket {
    constructor() {
        super();

        this.state = {
            TCP: { establishing: false, established: false },
            session: { id: null, establishing: false, established: false },
            connection: { id: null, establishing: false, established: false, seq_num: 0 },
            error: { code: null, msg: null }
        };

        this.plcProperties = { 
            vendorID: null,
            deviceType: null,
            productCode: null,
            majorRevision: null,
            minorRevision: null,
            status: null,
            serialNumber: null,
            productNameLength: null,
            productName: null,
        };

        // Initialize Event Handlers for Underlying Socket Class
        this._initializeEventHandlers();
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

    // region Public Method Definitions

    /**
     * Initializes Session with Desired IP Address or FQDN
     * and Returns a Promise with the Established Session ID
     *
     * @override
     * @param {string} IP_ADDR - IPv4 Address (can also accept a FQDN, provided port forwarding is configured correctly.)
     * @returns {Promise}
     * @memberof ENIP
     */
    async connect(IP_ADDR) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }
        await new Promise((resolve, reject) => {
            lookup(IP_ADDR, (err, addr) => {
                if (err) reject(new Error("DNS Lookup failed for IP_ADDR " + IP_ADDR));

                if (!isIPv4(addr)) {
                    reject(new Error("Invalid IP_ADDR <string> passed to Controller <class>"));
                }
                resolve();
            });
        });

        const { registerSession } = encapsulation;

        this.state.session.establishing = true;
        this.state.TCP.establishing = true;

        const connectErr = new Error(
            "TIMEOUT occurred while attempting to establish TCP connection with Controller."
        );

        // Connect to Controller and Then Send Register Session Packet
        await promiseTimeout(
            new Promise(resolve => {
                super.connect(
                    EIP_PORT,
                    IP_ADDR,
                    () => {
                        this.state.TCP.establishing = false;
                        this.state.TCP.established = true;

                        this.write(registerSession());
                        resolve();
                    }
                );
            }),
            10000,
            connectErr
        );

        const sessionErr = new Error(
            "TIMEOUT occurred while attempting to establish Ethernet/IP session with Controller."
        );

        // Wait for Session to be Registered
        const sessid = await promiseTimeout(
            new Promise(resolve => {
                this.on("Session Registered", sessid => {
                    resolve(sessid);
                });

                this.on("Session Registration Failed", error => {
                    this.state.error.code = error;
                    this.state.error.msg = "Failed to Register Session";
                    resolve(null);
                });
            }),
            10000,
            sessionErr
        );

        // Clean Up Local Listeners
        this.removeAllListeners("Session Registered");
        this.removeAllListeners("Session Registration Failed");

        // Return Session ID
        return sessid;
    }

    /**
     * Accesses the listIdentity command of EthernetIP
     * and returns the parsed properties of the EthernetIP device
     *
     * @override
     * @param {string} IP_ADDR - IPv4 Address (can also accept a FQDN, provided port forwarding is configured correctly.)
     * @returns {Promise}
     * @memberof ENIP
     */
    async listIdentity(IP_ADDR) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }
        await new Promise((resolve, reject) => {
            lookup(IP_ADDR, (err, addr) => {
                if (err) reject(new Error("DNS Lookup failed for IP_ADDR " + IP_ADDR));

                if (!isIPv4(addr)) {
                    reject(new Error("Invalid IP_ADDR <string> passed to Controller <class>"));
                }
                resolve();
            });
        });

        const { listIdentity } = encapsulation;

        this.state.TCP.establishing = true;

        const connectErr = new Error(
            "TIMEOUT occurred while attempting to establish TCP connection with Controller."
        );

        // Connect to Controller and Then Send Register Session Packet
        await promiseTimeout(
            new Promise(resolve => {
                super.connect(
                    EIP_PORT,
                    IP_ADDR,
                    () => {
                        this.state.TCP.establishing = false;
                        this.state.TCP.established = true;

                        this.write(listIdentity());
                        resolve();
                    }
                );
            }),
            10000,
            connectErr
        );

        const listIdentityErr = new Error(
            "TIMEOUT occurred while attempting to use listIdentity Service of Ethernet/IP with Controller."
        );

        // Wait for Session to be Registered
        const listData = await promiseTimeout(
            new Promise(resolve => {
                this.on("ListIdentity Received", listData => {
                    resolve(listData);
                });
            }),
            10000,
            listIdentityErr
        );

        let ptr = 8; // Starting with Socket Address
        this.plcProperties.socketAddress = {};
        this.plcProperties.socketAddress.sin_family = listData.readUInt16BE(ptr);
        ptr+=2;
        this.plcProperties.socketAddress.sin_port = listData.readUInt16BE(ptr);
        ptr+=2;
        this.plcProperties.socketAddress.sin_addr = listData.readUInt8(ptr).toString()+
        "."+listData.readUInt8(ptr+1).toString()+
        "."+listData.readUInt8(ptr+2).toString()+
        "."+listData.readUInt8(ptr+3).toString(); 
        ptr+=4;
        this.plcProperties.socketAddress.sin_zero = 0;
        ptr+=8;

        // Now follows the asset data
        this.plcProperties.vendorID = listData.readUInt16LE(ptr);
        ptr+=2;
        this.plcProperties.deviceType = listData.readUInt16LE(ptr);
        ptr+=2;
        this.plcProperties.productCode = listData.readUInt16LE(ptr);
        ptr+=2;
        this.plcProperties.majorRevision = listData.readUInt8(ptr);
        ptr+=1;
        this.plcProperties.minorRevision = listData.readUInt8(ptr);
        ptr+=1;
        this.plcProperties.status = listData.readUInt16LE(ptr);
        ptr+=2;
        this.plcProperties.serialNumber = listData.readUInt32LE(ptr);
        ptr+=4;
        this.plcProperties.productNameLength = listData.readUInt8(ptr);
        ptr+=1;
        this.plcProperties.productName = listData.toString("ascii",ptr,listData.length-1);
        ptr+=this.plcProperties.productNameLength;
        this.plcProperties.state = listData.readUInt8(ptr);

        // Clean Up Local Listeners
        this.removeAllListeners("ListIdentity Received");

        super.destroy();

        // We destroyed the socket
        this.state.TCP.establishing = false;
        this.state.TCP.established = false;

        return this.plcProperties;
    }

    /**
     * Accesses the listServices command of EthernetIP
     * and returns the parsed properties of the services
     *
     * @override
     * @param {string} IP_ADDR - IPv4 Address (can also accept a FQDN, provided port forwarding is configured correctly.)
     * @returns {Promise}
     * @memberof ENIP
     */
    async listServices(IP_ADDR) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }
        await new Promise((resolve, reject) => {
            lookup(IP_ADDR, (err, addr) => {
                if (err) reject(new Error("DNS Lookup failed for IP_ADDR " + IP_ADDR));

                if (!isIPv4(addr)) {
                    reject(new Error("Invalid IP_ADDR <string> passed to Controller <class>"));
                }
                resolve();
            });
        });

        const { listServices } = encapsulation;

        this.state.TCP.establishing = true;

        const connectErr = new Error(
            "TIMEOUT occurred while attempting to establish TCP connection with Controller."
        );

        // Connect to Controller and Then Send Register Session Packet
        await promiseTimeout(
            new Promise(resolve => {
                super.connect(
                    EIP_PORT,
                    IP_ADDR,
                    () => {
                        this.state.TCP.establishing = false;
                        this.state.TCP.established = true;

                        this.write(listServices());
                        resolve();
                    }
                );
            }),
            10000,
            connectErr
        );

        const listServicesErr = new Error(
            "TIMEOUT occurred while attempting to use listServices Command of Ethernet/IP with Controller."
        );

        // Create a service object as a container for the parsed data
        const service = {
            TypeID: null,
            ItemLength: null,
            EncapVer: null,
            Capabilities: null,
            Name: null
        };

        // Wait for Session to be Registered
        const serviceData = await promiseTimeout(
            new Promise(resolve => {
                this.on("ListServices Received", serviceData => {
                    resolve(serviceData);
                });
            }),
            10000,
            listServicesErr
        );
        
        let ptr = 2; // Other data is not relevant.
        service.TypeID = serviceData.readUInt16LE(ptr);
        ptr+=2;
        service.ItemLength = serviceData.readUInt16LE(ptr);
        ptr+=2;
        service.EncapVer = serviceData.readUInt16LE(ptr);
        ptr+=2;
        service.Capabilities = serviceData.readUInt16LE(ptr);
        ptr+=2;
        service.Name = serviceData.toString("ascii",ptr,serviceData.length);

        
        // Clean Up Local Listeners
        this.removeAllListeners("ListServices Received");

        super.destroy();

        // We destroyed the socket
        this.state.TCP.establishing = false;
        this.state.TCP.established = false;

        return service;
    }

    /**
     * Writes Ethernet/IP Data to Socket as an Unconnected Message
     * or a Transport Class 1 Datagram
     *
     * NOTE: Cant Override Socket Write due to net.Socket.write
     *        implementation. =[. Thus, I am spinning up a new Method to
     *        handle it. Dont Use Enip.write, use this function instead.
     *
     * @param {buffer} data - Data Buffer to be Encapsulated
     * @param {boolean} [connected=false]
     * @param {number} [timeout=10] - Timeoue (sec)
     * @param {function} [cb=null] - Callback to be Passed to Parent.Write()
     * @memberof ENIP
     */
    write_cip(data, connected = false, timeout = 10, cb = null) {
        const { sendRRData, sendUnitData } = encapsulation;
        const { session, connection } = this.state;

        if (session.established) {
            const packet = connected
                ? sendUnitData(session.id, data, connection.id, connection.seq_num)
                : sendRRData(session.id, data, timeout);

            if (cb) {
                this.write(packet, cb);
            } else {
                this.write(packet);
            }
        }
    }

    /**
     * Sends Unregister Session Command and Destroys Underlying TCP Socket
     *
     * @override
     * @param {Exception} exception - Gets passed to 'error' event handler
     * @memberof ENIP
     */
    destroy(exception) {
        const { unregisterSession } = encapsulation;
        this.write(unregisterSession(this.state.session.id), () => {
            this.state.session.established = false;
            super.destroy(exception);
        });
    }
    // endregion

    // region Private Method Definitions
    _initializeEventHandlers() {
        this.on("data", this._handleDataEvent);
        this.on("close", this._handleCloseEvent);
    }
    //endregion

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

    /**
     * Socket.on('data) Event Handler
     *
     * @param {Buffer} - Data Received from Socket.on('data', ...)
     * @memberof ENIP
     */
    _handleDataEvent(data) {
        const { header, CPF, commands } = encapsulation;

        const encapsulatedData = header.parse(data);
        const { statusCode, status, commandCode } = encapsulatedData;

        if (statusCode !== 0) {
            console.log(`Error <${statusCode}>:`.red, status.red);

            this.state.error.code = statusCode;
            this.state.error.msg = status;

            this.emit("Session Registration Failed", this.state.error);
        } else {
            this.state.error.code = null;
            this.state.error.msg = null;
            /* eslint-disable indent */
            switch (commandCode) {
                case commands.RegisterSession:
                    this.state.session.establishing = false;
                    this.state.session.established = true;
                    this.state.session.id = encapsulatedData.session;
                    this.emit("Session Registered", this.state.session.id);
                    break;

                case commands.UnregisterSession:
                    this.state.session.established = false;
                    this.emit("Session Unregistered");
                    break;

                case commands.SendRRData: {
                    let buf1 = Buffer.alloc(encapsulatedData.length - 6); // length of Data - Interface Handle <UDINT> and Timeout <UINT>
                    encapsulatedData.data.copy(buf1, 0, 6);

                    const srrd = CPF.parse(buf1);
                    this.emit("SendRRData Received", srrd);
                    break;
                }
                case commands.SendUnitData: {
                    let buf2 = Buffer.alloc(encapsulatedData.length - 6); // length of Data - Interface Handle <UDINT> and Timeout <UINT>
                    encapsulatedData.data.copy(buf2, 0, 6);

                    const sud = CPF.parse(buf2);
                    this.emit("SendUnitData Received", sud);
                    break;
                }
                case commands.ListIdentity: {
                    const listData = encapsulatedData.data;
                    this.emit("ListIdentity Received", listData);
                    break;
                }
                case commands.ListServices: {
                    const serviceData = encapsulatedData.data;
                    this.emit("ListServices Received", serviceData);
                    break;
                }
                default:
                    this.emit("Unhandled Encapsulated Command Received", encapsulatedData);
            }
            /* eslint-enable indent */
        }
    }

    /**
     * Socket.on('close',...) Event Handler
     *
     * @param {Boolean} hadError
     * @memberof ENIP
     */
    _handleCloseEvent(hadError) {
        this.state.session.established = false;
        this.state.TCP.established = false;
        if (hadError) throw new Error("Socket Transmission Failure Occurred!");
    }
    // endregion
}

module.exports = { ENIP, CIP, encapsulation };
