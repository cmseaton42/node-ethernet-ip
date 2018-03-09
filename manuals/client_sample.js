const { Socket } = require("net");
const { EIP_PORT } = require("./config");

let client = new Socket();

let BUFFER = Buffer.alloc(28);

BUFFER.writeInt16LE(0x65, 0);
BUFFER.writeInt16LE(4, 2);
BUFFER.writeInt32LE(0, 4);
BUFFER.writeInt32LE(0, 8);
Buffer.alloc(8, 0x00).copy(BUFFER, 12);
BUFFER.writeInt32LE(0, 20);

BUFFER.writeInt16LE(0x01, 24);
BUFFER.writeInt16LE(0, 26);

client.connect(EIP_PORT, "10.2.40.134", () => {
    console.log("****************** CONNECTED ******************");

    client.setTimeout(1000); // 10 seconds
    client.write(BUFFER); // Write Buffer to Output Stream

    console.log(`      DATA SENT: ${BUFFER.toString("hex")} \n       -> Timeout: 10 seconds  \n`);
});

client.on("data", data => {
    const sessionId = data.readInt32LE(4);
    console.log(sessionId.toString(16), data.toString("hex"));
});

client.on("end", () => {
    console.log("*** DATA END ***");

    client.destroy();
});

// Handle Timeout Event
client.on("timeout", () => {
    console.log("\n      CONNECTION TIMED OUT \n");

    client.destroy();
});

// Handle Close Event
client.on("close", () => {
    console.log("***********************************************\n", "\nCONNECTION CLOSED\n\n");
});

// Handle Error Event
client.on("error", err => {
    console.log("======= ERROR DETECTED =======\n");
    console.log(err);
});
