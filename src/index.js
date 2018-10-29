const Controller = require("./controller");
const Tag = require("./tag");
const TagGroup = require("./tag-group");
const EthernetIP = require("./enip");
const util = require("./utilities");

const PLC = new Controller();
PLC.connect("192.168.1.11",0).then(async () => {
    var x = await PLC.writeGenericSingle(0xF5,0x01,0x06,Buffer([0x05,0x00,0x12,0x23,0x34,0x00]));
    console.log(x);
    x = await PLC.readGenericSingle(0xF5,0x01,0x06);
    console.log(x);
    x = await PLC.readGenericAll(0xF5,0x01);
    console.log(x);
});

module.exports = { Controller, Tag, TagGroup, EthernetIP, util };
