const os = require("os");
const dgram = require("dgram");
const encapsulation = require("../enip/encapsulation");

/**
 * Wraps a Promise with a Timeout
 *
 * @param {Tag} tag - Tag Object to Write
 * @param {number} - Timeout Length (ms)
 * @param {Error|string} - Error to Emit if Timeout Occurs
 * @returns {Promise}
 * @memberof Controller
 */
const promiseTimeout = (promise, ms, error = new Error("ASYNC Function Call Timed Out!!!")) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(error), ms);
        promise.then(resolve).catch(reject);
    });
};

/**
 * Delays X ms
 *
 * @param {number} ms - Delay Length (ms)
 * @returns {Promise}
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends a broadcast to a specified IPv4 Interface in order to discover all present EthernetIP
 * devices.
 *
 * @param {string} ipInterface - The interface the broadcast is sent to
 * @returns {Promise}
 * @memberof Utilities
 */
function _getENIPDevicesProm(ipInterface){
    return new Promise((resolve,reject)=>{
        const ENIPList = new Array();
        let dsock = dgram.createSocket("udp4");

        let timeoutHandle = null;
        dsock.bind(0,ipInterface["address"], () => {
            dsock.setBroadcast(true);
            const { listIdentity } = encapsulation;
            
            dsock.send(listIdentity(),44818,"255.255.255.255", (err) => {
                if (err) throw new Error ("Error when sending via UDP: "+err);
            });

            // Resolve after 100 milliseconds
            timeoutHandle = setTimeout(()=>{
                resolve(ENIPList);
            },100);           
        });

        dsock.on("error", function(err) {
            console.log("UDP Error caught: " + err.stack);
            if(timeoutHandle !== null){
                clearTimeout(timeoutHandle);
            }
            reject(err);
        });

        dsock.on("message", function(msg) {
            if(msg.readUInt16LE(0) === 0x0063) { //Got em! Caught a listIdentity response.
                const plcProperties = {};
                let ptr = 32; // Starting with Socket Address
                plcProperties.socketAddress = {};
                plcProperties.socketAddress.sin_family = msg.readUInt16BE(ptr);
                ptr+=2;
                plcProperties.socketAddress.sin_port = msg.readUInt16BE(ptr);
                ptr+=2;
                plcProperties.socketAddress.sin_addr = msg.readUInt8(ptr).toString()+
                "."+msg.readUInt8(ptr+1).toString()+
                "."+msg.readUInt8(ptr+2).toString()+
                "."+msg.readUInt8(ptr+3).toString(); 
                ptr+=4;
                plcProperties.socketAddress.sin_zero = 0;
                ptr+=8;
        
                // Now follows the asset data
                plcProperties.vendorID = msg.readUInt16LE(ptr);
                ptr+=2;
                plcProperties.deviceType = msg.readUInt16LE(ptr);
                ptr+=2;
                plcProperties.productCode = msg.readUInt16LE(ptr);
                ptr+=2;
                plcProperties.majorRevision = msg.readUInt8(ptr);
                ptr+=1;
                plcProperties.minorRevision = msg.readUInt8(ptr);
                ptr+=1;
                plcProperties.status = msg.readUInt16LE(ptr);
                ptr+=2;
                plcProperties.serialNumber = msg.readUInt32LE(ptr);
                ptr+=4;
                plcProperties.productNameLength = msg.readUInt8(ptr);
                ptr+=1;
                plcProperties.productName = msg.toString("ascii",ptr,msg.length-1);
                ptr+=plcProperties.productNameLength;
                plcProperties.state = msg.readUInt8(ptr);

                ENIPList.push(plcProperties);
            }
        });
        dsock.on("close", function() {
            //console.log("TMP: On close");
        });

        dsock.on("listening", function() {
            //console.log("TMP: On listening");
        });
    });
}

/**
 * Sends a broadcast to a specified IPv4 Interface in order to discover all present EthernetIP
 * devices. If no interface is specified, checks all available interfaces and sends a broadcast to them.
 *
 * @param {string} IPv4Interface - The interface we want to check the PLCs of, if not specified, all interfaces will be checked
 * @returns {Promise} - an object with a key: interface - value: list of attaches devices pair.
 * @memberof Utilities
 */
async function discover(IPv4Interface = null) {
    const ENIPDevice = {};
    const IPv4List = new Array();

    /* No specified interface means we need to discover them on our own */
    if(IPv4Interface === null) {
        const interfaceList = os.networkInterfaces();
        const iFaceListKeys = Object.keys(interfaceList);
        const iFaceListLen = iFaceListKeys.length;
        for (let i = 0; i < iFaceListLen; i += 1) {
            let interfaces = interfaceList[iFaceListKeys[i]];
            for (const addresses of interfaces) {
                if(addresses["family"] === "IPv4") {
                    IPv4List.push(addresses);
                }
            }
        }
    }
    /* An interface has been specified! */
    else {
        const IPv4RegEx = new RegExp("^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
        if (!IPv4RegEx.test(IPv4Interface)) throw new Error("Interface must match IPv4 format!");
        IPv4List.push({address: IPv4Interface});    
    }

    /* For each interface, we send a broadcast with a listIdentity command */
    for (const addresses of IPv4List) {
        const ENIPDevices = await _getENIPDevicesProm(addresses); // Wait for an Interface to get all Devices
        if (!Array.isArray(ENIPDevices) || !ENIPDevices.length) {
            // No Devices returned
        }
        else {
            ENIPDevice[addresses.address] = ENIPDevices;
        }
    }
    return ENIPDevice;
}

module.exports = { promiseTimeout, delay, discover };
