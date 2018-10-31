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
 * devices. If no interface is specified, checks all available interfaces and sends a broadcast to them.
 *
 * @override
 * @param {string} IPv4Interface - The interface we want to check the PLCs of, if not specified, all interfaces will be checked
 * @param {function} cb - The callback that is to be executed after the search is finished
 * @returns {Promise}
 * @memberof ENIP
 */
function discover(cb,IPv4Interface = undefined) {
    const ENIPList = new Array();
    if(IPv4Interface == undefined) {
        const IPv4List = new Array();
        const interfaceList = os.networkInterfaces();
        const iFaceListKeys = Object.keys(interfaceList);
        const iFaceListLen = iFaceListKeys.length;
        for (let i = 0; i < iFaceListLen; i += 1) {
            let interfaces = interfaceList[iFaceListKeys[i]];
            for (const addresses of interfaces) {
                if(addresses["family"] == "IPv4") {
                    IPv4List.push(addresses);
                }
            }
        }
        for (const addresses of IPv4List) {
            let dsock = dgram.createSocket("udp4");
            dsock.bind(0,addresses["address"], () => {
                dsock.setBroadcast(true);
                const { listIdentity } = encapsulation;
                dsock.send(listIdentity(),44818,"255.255.255.255", (err) => {
                    if (err) throw new Error ("Error when sending via UDP: "+err);
                });
            });

            dsock.on("error", function(err) {
                console.log("UDP Error caught: " + err.stack);
            });

            dsock.on("message", function(msg) {
                if(msg.readUInt16LE(0) == 0x0063) { //Got em! Caught an Ethernet/IP response.
                    const enipPort = msg.readUInt16BE(34);
                    const ipString = msg.readUInt8(36).toString()+
                    "."+msg.readUInt8(37).toString()+
                    "."+msg.readUInt8(38).toString()+
                    "."+msg.readUInt8(39).toString(); 
                    ENIPList.push({port:enipPort,ip:ipString});
                }
            });
        }
    }
    else {
        const IPv4RegEx = new RegExp("^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
        if (!IPv4RegEx.test(IPv4Interface)) throw new Error("Interface must match IPv4 format!");
        let dsock = dgram.createSocket("udp4");
        dsock.bind(0,IPv4Interface, () => {
            dsock.setBroadcast(true);
            const { listIdentity } = encapsulation;
            dsock.send(listIdentity(),44818,"255.255.255.255", (err) => {
                if (err) throw new Error ("Error when sending via UDP: "+err);
            });
        });

        dsock.on("error", function(err) {
            console.log("UDP Error caught: " + err.stack);
        });

        dsock.on("message", function(msg) {
            if(msg.readUInt16LE(0) == 0x0063) { //Got em! Caught an Ethernet/IP response.
                const enipPort = msg.readUInt16BE(34);
                const ipString = msg.readUInt8(36).toString()+
                "."+msg.readUInt8(37).toString()+
                "."+msg.readUInt8(38).toString()+
                "."+msg.readUInt8(39).toString(); 
                ENIPList.push({port:enipPort,ip:ipString});
            }
        });
    }
      
    setTimeout(cb, 1500, ENIPList);
}

module.exports = { promiseTimeout, delay, discover };
